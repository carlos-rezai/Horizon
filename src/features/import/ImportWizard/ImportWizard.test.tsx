// @vitest-environment jsdom
import {
  render,
  screen,
  cleanup,
  fireEvent,
  waitFor,
} from "@testing-library/react";
import {
  describe,
  it,
  expect,
  afterEach,
  beforeAll,
  vi,
  type Mock,
} from "vitest";
import { ThemeProvider } from "styled-components";
import { theme } from "../../../tokens";
import ImportWizard from "./ImportWizard";
import type { AccountWithBalance } from "../../../types/account";
import type { Category } from "../../../types/category";
import type { CommitImportInput, ImportPreview } from "../importTypes";

/**
 * Issue #163 — the Import wizard's Review step must use the shared
 * `CategorySelect` (hidden filtered + inline-add) for each row's category, and
 * the value the user picks in review — including a category created inline — is
 * exactly what commits, not the auto-categorizer's guess.
 *
 * These are UI-level tests because the swap from the bare `<Select>` to
 * `CategorySelect` is the genuinely new behaviour; the hook's thread-through
 * (`setCategory` → `confirm`) already works.
 */

type PreviewFn = (accountId: string, file: File) => Promise<ImportPreview>;
type CommitFn = (input: CommitImportInput) => Promise<void>;

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const accounts: AccountWithBalance[] = [
  {
    id: "acc-1",
    kind: "Girokonto",
    name: "Main",
    openingBalance: 0,
    openingDate: "2026-01-01",
    balance: 0,
  },
];

const file = new File(["x"], "dkb-2026-03.csv", { type: "text/csv" });

function makePreview(): ImportPreview {
  return {
    bank: "DKB",
    mapping: {
      date: "Buchungsdatum",
      description: "Verwendungszweck",
      amount: "Betrag (€)",
    },
    delimiter: ";",
    decimal: ",",
    dateFmt: "DD.MM.YYYY",
    columns: ["Buchungsdatum", "Verwendungszweck", "Betrag (€)"],
    rows: [
      {
        id: "r0",
        date: "2026-03-05",
        description: "REWE",
        amount: -1299,
        category: "Food",
      },
      {
        id: "r1",
        date: "2026-03-12",
        description: "Gehalt",
        amount: 250000,
        category: "Income",
        recurring: true,
      },
    ],
    summary: {
      total: 2,
      duplicates: 0,
      recurring: 1,
      pending: 0,
      rejected: { count: 0, samples: [] },
    },
  };
}

/**
 * `CategorySelect` fetches `/categories` itself. Answer every GET with `list`
 * and every POST (inline-add) with `created`.
 */
function mockCategoryFetch(list: Category[], created?: Category) {
  vi.spyOn(globalThis, "fetch").mockImplementation(
    (_url: RequestInfo | URL, init?: RequestInit) => {
      const method = init?.method ?? "GET";
      const body = method === "POST" ? (created ?? list[0]) : (list as unknown);
      return Promise.resolve({
        ok: true,
        json: async () => body,
      } as Response);
    }
  );
}

function renderWizard(
  categories: Category[],
  commit: Mock<CommitFn>,
  data: ImportPreview = makePreview()
) {
  const preview = vi.fn<PreviewFn>().mockResolvedValue(data);
  render(
    <ThemeProvider theme={theme}>
      <ImportWizard
        importAccounts={accounts}
        categories={categories}
        file={file}
        presetAccountId={null}
        preview={preview}
        commit={commit}
        onClose={vi.fn()}
        onDone={vi.fn()}
      />
    </ThemeProvider>
  );
  return { preview };
}

/** Advance from the Account step (1) to the Review step (3). */
async function gotoReview() {
  const mapBtn = await screen.findByRole("button", { name: /map columns/i });
  await waitFor(() => expect(mapBtn).not.toBeDisabled());
  fireEvent.click(mapBtn);
  fireEvent.click(screen.getByRole("button", { name: /review \d+ rows/i }));
}

describe("ImportWizard — review-step category picker (#163)", () => {
  it("offers the inline-add affordance on each review row (it's a CategorySelect, not a read-only Select)", async () => {
    const categories: Category[] = [
      {
        id: "c-food",
        name: "Food",
        isDefault: true,
        color: "#74C29B",
        hidden: false,
      },
      {
        id: "c-income",
        name: "Income",
        isDefault: false,
        color: "#7BA7D9",
        hidden: false,
      },
    ];
    mockCategoryFetch(categories);
    renderWizard(categories, vi.fn<CommitFn>().mockResolvedValue(undefined));

    await gotoReview();

    // The row picker loaded its options from GET /categories.
    await screen.findAllByRole("option", { name: "Food" });

    // The bare <Select> has no such option; CategorySelect always appends it.
    expect(
      screen.queryAllByRole("option", { name: /\+\s*add category/i }).length
    ).toBeGreaterThan(0);
  });

  it("filters hidden categories out of the review-row picker", async () => {
    const categories: Category[] = [
      {
        id: "c-food",
        name: "Food",
        isDefault: true,
        color: "#74C29B",
        hidden: false,
      },
      {
        id: "c-income",
        name: "Income",
        isDefault: false,
        color: "#7BA7D9",
        hidden: false,
      },
      {
        id: "c-arch",
        name: "Archived",
        isDefault: true,
        color: "#909AAE",
        hidden: true,
      },
    ];
    mockCategoryFetch(categories);
    renderWizard(categories, vi.fn<CommitFn>().mockResolvedValue(undefined));

    await gotoReview();

    await screen.findAllByRole("option", { name: "Food" });
    expect(screen.queryAllByRole("option", { name: "Archived" })).toHaveLength(
      0
    );
  });

  it("commits the category created inline during review, not the auto-categorizer's guess", async () => {
    const categories: Category[] = [
      {
        id: "c-food",
        name: "Food",
        isDefault: true,
        color: "#74C29B",
        hidden: false,
      },
      {
        id: "c-income",
        name: "Income",
        isDefault: false,
        color: "#7BA7D9",
        hidden: false,
      },
    ];
    const created: Category = {
      id: "c-transport",
      name: "Transport",
      isDefault: false,
      color: "#E0A458",
      hidden: false,
    };
    mockCategoryFetch(categories, created);
    const commit = vi.fn<CommitFn>().mockResolvedValue(undefined);
    renderWizard(categories, commit);

    await gotoReview();
    await screen.findAllByRole("option", { name: "Food" });

    // Drive the inline-add on the first (included) row's CategorySelect. Each
    // row fetches its own category list, so waiting on the options above only
    // proves *some* row loaded — wait for this row's picker specifically, or
    // the change lands on a still-disabled select.
    const rowPickers = screen.getAllByLabelText(/^category$/i);
    await waitFor(() => expect(rowPickers[0]).not.toBeDisabled());
    fireEvent.change(rowPickers[0], { target: { value: "__add__" } });

    const input = await screen.findByRole("textbox", {
      name: /new category/i,
    });
    fireEvent.change(input, { target: { value: "Transport" } });
    fireEvent.click(screen.getByRole("button", { name: /add category/i }));

    // The new category is now the row's selection. Waiting for the option to
    // merely exist isn't enough: it appears in the same commit that sets the
    // selection, but the row only learns the name via CategorySelect's effect.
    await screen.findAllByRole("option", { name: "Transport" });
    await waitFor(() =>
      expect(screen.getAllByLabelText(/^category$/i)[0]).toHaveValue(
        "c-transport"
      )
    );

    fireEvent.click(
      screen.getByRole("button", { name: /import 1 transaction/i })
    );

    await waitFor(() => expect(commit).toHaveBeenCalledTimes(1));
    const payload = commit.mock.calls[0][0];
    expect(payload.rows).toEqual([
      {
        date: "2026-03-05",
        amount: -1299,
        description: "REWE",
        category: "Transport",
      },
    ]);
  });
});

/**
 * Issue #190 — the review step's description cell is an editable input on every
 * row, and a blank description is a *hard blocker*: the row stays checked, gates
 * the commit, and is repaired in place. Previously the preview accepted such a
 * row, `ImportRowSchema` rejected it on commit, and the user got a bare "Failed
 * to import statement" with nothing to act on.
 *
 * The error state is asserted via `aria-invalid` rather than the border/accent
 * styling: it is the accessible expression of the same state and survives a
 * restyle.
 */

const twoCategories: Category[] = [
  {
    id: "c-food",
    name: "Food",
    isDefault: true,
    color: "#74C29B",
    hidden: false,
  },
  {
    id: "c-income",
    name: "Income",
    isDefault: false,
    color: "#7BA7D9",
    hidden: false,
  },
];

/** A statement whose second row has an empty description column. */
function makeBlankDescriptionPreview(): ImportPreview {
  const base = makePreview();
  return {
    ...base,
    rows: [
      {
        id: "r0",
        date: "2026-03-05",
        description: "REWE",
        amount: -1299,
        category: "Food",
      },
      {
        id: "r1",
        date: "2026-03-08",
        description: "",
        amount: -4500,
        category: "Food",
      },
    ],
    summary: {
      total: 2,
      duplicates: 0,
      recurring: 0,
      pending: 0,
      rejected: { count: 0, samples: [] },
    },
  };
}

const descriptionInputs = () => screen.getAllByLabelText(/^description$/i);

describe("ImportWizard — editable description and blockers (#190)", () => {
  it("renders every row's description as an editable input, blocked or not", async () => {
    mockCategoryFetch(twoCategories);
    renderWizard(
      twoCategories,
      vi.fn<CommitFn>().mockResolvedValue(undefined),
      makeBlankDescriptionPreview()
    );

    await gotoReview();

    // Two identical-looking rows behave identically: editability never depends
    // on data the user can't see.
    const inputs = descriptionInputs();
    expect(inputs).toHaveLength(2);
    expect(inputs[0]).toHaveValue("REWE");
    expect(inputs[1]).toHaveValue("");
  });

  it("marks only the blank-description row as invalid, and offers it the fix as its placeholder", async () => {
    mockCategoryFetch(twoCategories);
    renderWizard(
      twoCategories,
      vi.fn<CommitFn>().mockResolvedValue(undefined),
      makeBlankDescriptionPreview()
    );

    await gotoReview();

    const [valid, blocked] = descriptionInputs();
    expect(blocked).toHaveAttribute("aria-invalid", "true");
    expect(blocked).toHaveAttribute("placeholder", "Add a description");
    expect(valid).not.toHaveAttribute("aria-invalid", "true");
  });

  it("disables Import while an included row is blocked, without changing the button's label", async () => {
    mockCategoryFetch(twoCategories);
    renderWizard(
      twoCategories,
      vi.fn<CommitFn>().mockResolvedValue(undefined),
      makeBlankDescriptionPreview()
    );

    await gotoReview();

    // The button doesn't shout — it keeps its count and simply can't be used.
    // Both rows are checked, so N is 2 even though one of them blocks.
    const importBtn = screen.getByRole("button", {
      name: /import 2 transactions/i,
    });
    expect(importBtn).toBeDisabled();
  });

  it("clears the row's error state as soon as a description is typed", async () => {
    mockCategoryFetch(twoCategories);
    renderWizard(
      twoCategories,
      vi.fn<CommitFn>().mockResolvedValue(undefined),
      makeBlankDescriptionPreview()
    );

    await gotoReview();

    fireEvent.change(descriptionInputs()[1], {
      target: { value: "Bäckerei Müller" },
    });

    await waitFor(() =>
      expect(descriptionInputs()[1]).not.toHaveAttribute("aria-invalid", "true")
    );
    expect(
      screen.getByRole("button", { name: /import 2 transactions/i })
    ).not.toBeDisabled();
  });

  it("lets the user uncheck a row they can't describe, which dims it and drops its error state", async () => {
    mockCategoryFetch(twoCategories);
    renderWizard(
      twoCategories,
      vi.fn<CommitFn>().mockResolvedValue(undefined),
      makeBlankDescriptionPreview()
    );

    await gotoReview();

    // The escape hatch: one unusable row can't make the file unimportable.
    fireEvent.click(screen.getAllByRole("button", { name: /toggle/i })[1]);

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /import 1 transaction$/i })
      ).not.toBeDisabled()
    );
    expect(descriptionInputs()[1]).not.toHaveAttribute("aria-invalid", "true");
  });

  it("imports a blank-description statement once the description is typed, committing what was typed", async () => {
    mockCategoryFetch(twoCategories);
    const commit = vi.fn<CommitFn>().mockResolvedValue(undefined);
    renderWizard(twoCategories, commit, makeBlankDescriptionPreview());

    await gotoReview();

    fireEvent.change(descriptionInputs()[1], {
      target: { value: "Bäckerei Müller" },
    });

    const importBtn = screen.getByRole("button", {
      name: /import 2 transactions/i,
    });
    await waitFor(() => expect(importBtn).not.toBeDisabled());
    fireEvent.click(importBtn);

    await waitFor(() => expect(commit).toHaveBeenCalledTimes(1));
    expect(commit.mock.calls[0][0].rows).toEqual([
      {
        date: "2026-03-05",
        amount: -1299,
        description: "REWE",
        category: "Food",
      },
      {
        date: "2026-03-08",
        amount: -4500,
        description: "Bäckerei Müller",
        category: "Food",
      },
    ]);
  });

  it("does not change a row's category when its description is edited", async () => {
    mockCategoryFetch(twoCategories);
    const commit = vi.fn<CommitFn>().mockResolvedValue(undefined);
    renderWizard(twoCategories, commit, makeBlankDescriptionPreview());

    await gotoReview();
    await screen.findAllByRole("option", { name: "Food" });

    // Typing `REWE` must not silently re-run the auto-categorizer.
    fireEvent.change(descriptionInputs()[1], { target: { value: "REWE" } });

    const importBtn = screen.getByRole("button", {
      name: /import 2 transactions/i,
    });
    await waitFor(() => expect(importBtn).not.toBeDisabled());
    fireEvent.click(importBtn);

    await waitFor(() => expect(commit).toHaveBeenCalledTimes(1));
    expect(commit.mock.calls[0][0].rows[1]).toMatchObject({
      description: "REWE",
      category: "Food",
    });
  });
});

/**
 * Issue #191 — rows dropped at parse were counted end-to-end into
 * `summary.rejected` and rendered by nothing. They now surface under the review
 * summary as a count plus the raw cells that failed, because a Rejected Row is
 * usually a symptom of a wrong column mapping rather than of bad data: it is a
 * Mapping Diagnostic pointing back at step 2, not an apology.
 *
 * A Rejected Row is not a blocked row and not a soft exclusion. It has no
 * parsed date or amount, so it never enters the review table and never gates
 * the Import button.
 */

/** A preview where three rows failed to parse — samples carry the raw cells. */
function makeRejectedPreview(): ImportPreview {
  const base = makePreview();
  return {
    ...base,
    summary: {
      total: 2,
      duplicates: 0,
      recurring: 1,
      pending: 0,
      rejected: {
        count: 3,
        samples: [
          { date: "2026-03-01", amount: "-12,50" },
          { date: "2026-03-02", amount: "-8,00" },
          { date: "2026-03-03", amount: "-45,90" },
        ],
      },
    },
  };
}

describe("ImportWizard — rejected-rows note (#191)", () => {
  it("names the count and points at the column mapping, showing the raw cells that failed", async () => {
    mockCategoryFetch(twoCategories);
    renderWizard(
      twoCategories,
      vi.fn<CommitFn>().mockResolvedValue(undefined),
      makeRejectedPreview()
    );

    await gotoReview();

    expect(
      await screen.findByText(
        /3 rows couldn't be read — check your column mapping/i
      )
    ).toBeInTheDocument();

    // The raw cells are the evidence: reading `2026-03-01` against a DD.MM.YYYY
    // statement is how the user sees which column is mapped wrong.
    expect(screen.getByText(/2026-03-01/)).toBeInTheDocument();
    expect(screen.getByText(/-45,90/)).toBeInTheDocument();
  });

  it("says nothing at all when every row parsed", async () => {
    mockCategoryFetch(twoCategories);
    renderWizard(twoCategories, vi.fn<CommitFn>().mockResolvedValue(undefined));

    await gotoReview();
    await screen.findAllByRole("option", { name: "Food" });

    expect(screen.queryByText(/couldn't be read/i)).not.toBeInTheDocument();
  });

  it("does not gate the Import button — a dropped row is a diagnostic, not a blocker", async () => {
    mockCategoryFetch(twoCategories);
    renderWizard(
      twoCategories,
      vi.fn<CommitFn>().mockResolvedValue(undefined),
      makeRejectedPreview()
    );

    await gotoReview();

    await screen.findByText(/couldn't be read/i);
    expect(
      screen.getByRole("button", { name: /import 1 transaction$/i })
    ).not.toBeDisabled();
  });

  it("keeps rejected rows out of the review table entirely", async () => {
    mockCategoryFetch(twoCategories);
    renderWizard(
      twoCategories,
      vi.fn<CommitFn>().mockResolvedValue(undefined),
      makeRejectedPreview()
    );

    await gotoReview();
    await screen.findByText(/couldn't be read/i);

    // Three rejections and two parsed rows still means two rows on screen:
    // there is no date or amount to render, and inventing one is the
    // placeholder this feature rules out.
    expect(descriptionInputs()).toHaveLength(2);
    expect(screen.queryByDisplayValue("-45,90")).not.toBeInTheDocument();
  });

  it("keeps the mapping diagnostic distinct from a blocked row's message", async () => {
    mockCategoryFetch(twoCategories);
    const blank = makeBlankDescriptionPreview();
    renderWizard(
      twoCategories,
      vi.fn<CommitFn>().mockResolvedValue(undefined),
      {
        ...blank,
        summary: {
          ...blank.summary,
          rejected: makeRejectedPreview().summary.rejected,
        },
      }
    );

    await gotoReview();

    // Two different problems with two different fixes: the note sends the user
    // back to step 2, the blocker is repaired here — and only the blocker
    // gates the commit. Merging them would misdirect both repairs.
    expect(await screen.findByText(/couldn't be read/i)).toBeInTheDocument();
    expect(descriptionInputs()[1]).toHaveAttribute("aria-invalid", "true");
    expect(
      screen.getByRole("button", { name: /import 2 transactions/i })
    ).toBeDisabled();
  });
});

/**
 * Issue #193 — navigation at year scale. Three blocked rows in twelve hundred
 * are unfindable by eye, so the review step grows two view-only affordances:
 *
 * - A **pill** reading "N rows need a description" beside the Import button.
 *   Clicking it jumps focus to the next blocked description input, keeping the
 *   surrounding rows in context.
 * - A **"Needs attention"** toggle that collapses the table to just the blocked
 *   rows — each an input, Tab walking straight through them.
 *
 * "Needs attention" means the same thing the commit gate means: a row that is
 * *included* **and** *blocked*. Unchecking a blocked row resolves it, so it
 * leaves both the pill count and the filtered view. Neither affordance can
 * change inclusion, descriptions, or what commits — they only change what the
 * user is looking at. On a clean statement, neither appears.
 *
 * The pill is a <button> named "N rows need a description"; the filter is a
 * toggle <button> named "Needs attention" whose aria-pressed reflects its
 * state. Jump is asserted through document.activeElement — scrollIntoView is
 * stubbed so a scroll call can't fail the test for the wrong reason.
 */

/** Four parsed rows, two of them blank-description and both included. */
function makeMultiBlockedPreview(): ImportPreview {
  const base = makePreview();
  return {
    ...base,
    rows: [
      {
        id: "r0",
        date: "2026-03-05",
        description: "REWE",
        amount: -1299,
        category: "Food",
      },
      {
        id: "r1",
        date: "2026-03-06",
        description: "",
        amount: -4500,
        category: "Food",
      },
      {
        id: "r2",
        date: "2026-03-07",
        description: "EDEKA",
        amount: -2200,
        category: "Food",
      },
      {
        id: "r3",
        date: "2026-03-08",
        description: "",
        amount: -1850,
        category: "Food",
      },
    ],
    summary: {
      total: 4,
      duplicates: 0,
      recurring: 0,
      pending: 0,
      rejected: { count: 0, samples: [] },
    },
  };
}

/**
 * Three rows: one clean, one blank-and-included, one blank-and-duplicate. The
 * duplicate is pre-unchecked, so its blank description is *not* a problem — an
 * excluded row can't block. The pill and filter must count only the included
 * blocked row.
 */
function makeMixedBlockedPreview(): ImportPreview {
  const base = makePreview();
  return {
    ...base,
    rows: [
      {
        id: "r0",
        date: "2026-03-05",
        description: "REWE",
        amount: -1299,
        category: "Food",
      },
      {
        id: "r1",
        date: "2026-03-06",
        description: "",
        amount: -4500,
        category: "Food",
      },
      {
        id: "r2",
        date: "2026-03-07",
        description: "",
        amount: -2200,
        category: "Food",
        duplicate: true,
      },
    ],
    summary: {
      total: 3,
      duplicates: 1,
      recurring: 0,
      pending: 0,
      rejected: { count: 0, samples: [] },
    },
  };
}

describe("ImportWizard — blocked-rows pill and Needs attention filter (#193)", () => {
  // jsdom has no layout engine, so scrollIntoView is undefined. A jump that
  // scrolls the row into view must not throw; focus is the assertable part.
  beforeAll(() => {
    Element.prototype.scrollIntoView = vi.fn();
  });

  it("shows a pill counting the included blocked rows beside the Import button", async () => {
    mockCategoryFetch(twoCategories);
    renderWizard(
      twoCategories,
      vi.fn<CommitFn>().mockResolvedValue(undefined),
      makeMultiBlockedPreview()
    );

    await gotoReview();

    // Two blank rows, both included → the scale of the problem, stated up front.
    expect(
      await screen.findByRole("button", {
        name: /2 rows need a description/i,
      })
    ).toBeInTheDocument();
    // The button doesn't shout; the pill is the thing to act on.
    expect(
      screen.getByRole("button", { name: /import 4 transactions/i })
    ).toBeDisabled();
  });

  it("shows no pill and no filter when nothing is blocked", async () => {
    mockCategoryFetch(twoCategories);
    renderWizard(twoCategories, vi.fn<CommitFn>().mockResolvedValue(undefined));

    await gotoReview();
    await screen.findAllByRole("option", { name: "Food" });

    // Happy path stays quiet: no navigation for a table that needs none.
    expect(
      screen.queryByRole("button", { name: /need.* a description/i })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /needs attention/i })
    ).not.toBeInTheDocument();
  });

  it("jumps focus to the next blocked description input each time the pill is clicked", async () => {
    mockCategoryFetch(twoCategories);
    renderWizard(
      twoCategories,
      vi.fn<CommitFn>().mockResolvedValue(undefined),
      makeMultiBlockedPreview()
    );

    await gotoReview();

    // inputs = [REWE, "", EDEKA, ""] → the blocked ones are indices 1 and 3.
    const pill = await screen.findByRole("button", {
      name: /2 rows need a description/i,
    });

    fireEvent.click(pill);
    await waitFor(() =>
      expect(document.activeElement).toBe(descriptionInputs()[1])
    );

    fireEvent.click(pill);
    await waitFor(() =>
      expect(document.activeElement).toBe(descriptionInputs()[3])
    );
  });

  it("collapses the table to just the blocked rows when Needs attention is on", async () => {
    mockCategoryFetch(twoCategories);
    renderWizard(
      twoCategories,
      vi.fn<CommitFn>().mockResolvedValue(undefined),
      makeMultiBlockedPreview()
    );

    await gotoReview();
    expect(descriptionInputs()).toHaveLength(4);

    fireEvent.click(screen.getByRole("button", { name: /needs attention/i }));

    // Only the two blank rows remain — each an input ready to be repaired.
    const remaining = descriptionInputs();
    expect(remaining).toHaveLength(2);
    expect(remaining[0]).toHaveValue("");
    expect(remaining[1]).toHaveValue("");
  });

  it("has the filter obviously off by default, with the whole statement visible", async () => {
    mockCategoryFetch(twoCategories);
    renderWizard(
      twoCategories,
      vi.fn<CommitFn>().mockResolvedValue(undefined),
      makeMultiBlockedPreview()
    );

    await gotoReview();

    const filter = screen.getByRole("button", { name: /needs attention/i });
    expect(filter).toHaveAttribute("aria-pressed", "false");
    // The user always starts by seeing everything.
    expect(descriptionInputs()).toHaveLength(4);
  });

  it("is view-only: toggling the filter on then off changes no description and no inclusion count", async () => {
    mockCategoryFetch(twoCategories);
    renderWizard(
      twoCategories,
      vi.fn<CommitFn>().mockResolvedValue(undefined),
      makeMultiBlockedPreview()
    );

    await gotoReview();
    const filter = screen.getByRole("button", { name: /needs attention/i });

    fireEvent.click(filter); // on → collapsed to the 2 blocked rows
    expect(descriptionInputs()).toHaveLength(2);
    fireEvent.click(filter); // off → the whole statement is back

    const inputs = descriptionInputs();
    expect(inputs).toHaveLength(4);
    expect(inputs[0]).toHaveValue("REWE");
    expect(inputs[1]).toHaveValue("");
    expect(inputs[2]).toHaveValue("EDEKA");
    expect(inputs[3]).toHaveValue("");
    // All four rows were and remain included — turning a view on didn't drop one.
    expect(
      screen.getByRole("button", { name: /import 4 transactions/i })
    ).toBeInTheDocument();
  });

  it("never changes what commits: repaired rows commit in full regardless of the filter", async () => {
    mockCategoryFetch(twoCategories);
    const commit = vi.fn<CommitFn>().mockResolvedValue(undefined);
    renderWizard(twoCategories, commit, makeMultiBlockedPreview());

    await gotoReview();

    // Repair both blanks, then toggle the filter on and off before committing.
    fireEvent.change(descriptionInputs()[1], {
      target: { value: "Bäckerei Müller" },
    });
    fireEvent.change(descriptionInputs()[3], { target: { value: "Kiosk" } });

    const filter = screen.getByRole("button", { name: /needs attention/i });
    fireEvent.click(filter);
    fireEvent.click(filter);

    const importBtn = screen.getByRole("button", {
      name: /import 4 transactions/i,
    });
    await waitFor(() => expect(importBtn).not.toBeDisabled());
    fireEvent.click(importBtn);

    await waitFor(() => expect(commit).toHaveBeenCalledTimes(1));
    const { rows } = commit.mock.calls[0][0];
    // All four included rows commit — the filter touched none of them.
    expect(rows).toHaveLength(4);
    expect(rows[1]).toMatchObject({ description: "Bäckerei Müller" });
    expect(rows[3]).toMatchObject({ description: "Kiosk" });
  });

  it("keeps the filtered blocked inputs focusable and in document order, so Tab walks through them", async () => {
    mockCategoryFetch(twoCategories);
    renderWizard(
      twoCategories,
      vi.fn<CommitFn>().mockResolvedValue(undefined),
      makeMultiBlockedPreview()
    );

    await gotoReview();
    fireEvent.click(screen.getByRole("button", { name: /needs attention/i }));

    // The precondition for a keyboard flow: both are reachable by Tab (enabled,
    // no negative tabindex) and the first precedes the second in the DOM, so
    // forward tabbing lands on them in order.
    const [first, second] = descriptionInputs();
    expect(first).not.toBeDisabled();
    expect(second).not.toBeDisabled();
    expect(first.tabIndex).toBeGreaterThanOrEqual(0);
    expect(second.tabIndex).toBeGreaterThanOrEqual(0);
    expect(
      first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it("counts and filters only included blocked rows — an excluded blank row is left out", async () => {
    mockCategoryFetch(twoCategories);
    renderWizard(
      twoCategories,
      vi.fn<CommitFn>().mockResolvedValue(undefined),
      makeMixedBlockedPreview()
    );

    await gotoReview();

    // r1 is blank+included; r2 is blank+duplicate (pre-unchecked). Only r1 needs
    // attention — the count agrees with the commit gate, never with raw blanks.
    expect(
      await screen.findByRole("button", {
        name: /1 row needs a description/i,
      })
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /needs attention/i }));

    // The filtered view holds the one included blocked row, not the duplicate.
    const remaining = descriptionInputs();
    expect(remaining).toHaveLength(1);
    expect(remaining[0]).toHaveValue("");
  });
});

// @vitest-environment jsdom
import {
  render,
  screen,
  cleanup,
  fireEvent,
  waitFor,
  within,
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
import CacheProvider from "../../../components/CacheProvider/CacheProvider";
import ImportWizard from "./ImportWizard";
import type { AccountWithBalance } from "../../../types/account";
import type { Category } from "../../../types/category";
import type {
  CommitImportInput,
  ImportPreview,
} from "../importTypes/importTypes";

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
    anchorBalance: 0,
    anchorDate: "2026-01-01",
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
        counterparty: "REWE",
        amount: -1299,
        category: "Food",
        categorySource: "learned",
      },
      {
        id: "r1",
        date: "2026-03-12",
        description: "Gehalt",
        counterparty: "Gehalt",
        amount: 250000,
        category: "Income",
        categorySource: "unmatched",
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
    <CacheProvider>
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
    </CacheProvider>
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
        counterparty: "REWE",
        category: "Transport",
        // Picking a category in review is a choice the commit learns from.
        categorySource: "chosen",
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
        counterparty: "REWE",
        amount: -1299,
        category: "Food",
        categorySource: "unmatched",
      },
      {
        id: "r1",
        date: "2026-03-08",
        description: "",
        counterparty: "",
        amount: -4500,
        category: "Food",
        categorySource: "unmatched",
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
        counterparty: "REWE",
        category: "Food",
        categorySource: "unmatched",
      },
      {
        date: "2026-03-08",
        amount: -4500,
        description: "Bäckerei Müller",
        counterparty: "",
        category: "Food",
        categorySource: "unmatched",
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
        counterparty: "REWE",
        amount: -1299,
        category: "Food",
        categorySource: "unmatched",
      },
      {
        id: "r1",
        date: "2026-03-06",
        description: "",
        counterparty: "",
        amount: -4500,
        category: "Food",
        categorySource: "unmatched",
      },
      {
        id: "r2",
        date: "2026-03-07",
        description: "EDEKA",
        counterparty: "EDEKA",
        amount: -2200,
        category: "Food",
        categorySource: "unmatched",
      },
      {
        id: "r3",
        date: "2026-03-08",
        description: "",
        counterparty: "",
        amount: -1850,
        category: "Food",
        categorySource: "unmatched",
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
        counterparty: "REWE",
        amount: -1299,
        category: "Food",
        categorySource: "unmatched",
      },
      {
        id: "r1",
        date: "2026-03-06",
        description: "",
        counterparty: "",
        amount: -4500,
        category: "Food",
        categorySource: "unmatched",
      },
      {
        id: "r2",
        date: "2026-03-07",
        description: "",
        counterparty: "",
        amount: -2200,
        category: "Food",
        categorySource: "unmatched",
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

/**
 * Issue #194 — the `flags` array drives both the pre-uncheck and the badges from
 * one source, so a counted-but-never-rendered flag becomes structurally
 * impossible. Two live bugs die here: `pending` was counted by `summarizeReview`
 * and badged by nothing, and a row that was both duplicate and recurring showed
 * only the first badge (a hand-maintained ternary). Now every applicable flag
 * renders its badge — in the row and in the summary bar.
 *
 * Badges are asserted by their visible text within a scope (the row, or the
 * summary count) rather than by class, so they survive a restyle. The row is
 * reached through its description input — the input and the Flag cell are
 * siblings in the same review row.
 */

/** One clean row and one pending ("vorgemerkt") row. */
function makePendingPreview(): ImportPreview {
  const base = makePreview();
  return {
    ...base,
    rows: [
      {
        id: "r0",
        date: "2026-03-05",
        description: "REWE",
        counterparty: "REWE",
        amount: -1299,
        category: "Food",
        categorySource: "unmatched",
      },
      {
        id: "r1",
        date: "2026-03-06",
        description: "Amazon Umsatz vorgemerkt",
        counterparty: "Amazon Umsatz vorgemerkt",
        amount: -2999,
        category: "Shopping",
        categorySource: "unmatched",
        pending: true,
      },
    ],
    summary: {
      total: 2,
      duplicates: 0,
      recurring: 0,
      pending: 1,
      rejected: { count: 0, samples: [] },
    },
  };
}

/** A single row that detection flagged as both a duplicate and recurring. */
function makeBothFlagsPreview(): ImportPreview {
  const base = makePreview();
  return {
    ...base,
    rows: [
      {
        id: "r0",
        date: "2026-03-05",
        description: "BVG Monatskarte",
        counterparty: "BVG Monatskarte",
        amount: -4900,
        category: "Transport",
        categorySource: "unmatched",
        duplicate: true,
        recurring: true,
      },
    ],
    summary: {
      total: 1,
      duplicates: 1,
      recurring: 1,
      pending: 0,
      rejected: { count: 0, samples: [] },
    },
  };
}

/** One of each: clean, duplicate, recurring, pending. */
function makeAllFlagsPreview(): ImportPreview {
  const base = makePreview();
  return {
    ...base,
    rows: [
      {
        id: "r0",
        date: "2026-03-05",
        description: "REWE",
        counterparty: "REWE",
        amount: -1299,
        category: "Food",
        categorySource: "unmatched",
      },
      {
        id: "r1",
        date: "2026-03-06",
        description: "Restaurant Mitte",
        counterparty: "Restaurant Mitte",
        amount: -6400,
        category: "Dining",
        categorySource: "unmatched",
        duplicate: true,
      },
      {
        id: "r2",
        date: "2026-03-07",
        description: "Gehalt",
        counterparty: "Gehalt",
        amount: 250000,
        category: "Income",
        categorySource: "unmatched",
        recurring: true,
      },
      {
        id: "r3",
        date: "2026-03-08",
        description: "Amazon Umsatz vorgemerkt",
        counterparty: "Amazon Umsatz vorgemerkt",
        amount: -2999,
        category: "Shopping",
        categorySource: "unmatched",
        pending: true,
      },
    ],
    summary: {
      total: 4,
      duplicates: 1,
      recurring: 1,
      pending: 1,
      rejected: { count: 0, samples: [] },
    },
  };
}

describe("ImportWizard — flags array drives exclusion and badges (#194)", () => {
  it("badges a pending row — the flag summarizeReview counts but the table used to render nowhere", async () => {
    mockCategoryFetch(twoCategories);
    renderWizard(
      twoCategories,
      vi.fn<CommitFn>().mockResolvedValue(undefined),
      makePendingPreview()
    );

    await gotoReview();

    // The pending row's Flag cell now explains why Horizon set it aside.
    const pendingRow = descriptionInputs()[1].parentElement as HTMLElement;
    expect(within(pendingRow).getByText(/pend/i)).toBeInTheDocument();
  });

  it("renders both badges on a row that is duplicate and recurring, not just the first", async () => {
    mockCategoryFetch(twoCategories);
    renderWizard(
      twoCategories,
      vi.fn<CommitFn>().mockResolvedValue(undefined),
      makeBothFlagsPreview()
    );

    await gotoReview();

    // The old ternary showed only "Dupe"; a user opting back in deserves both
    // pieces of evidence.
    const row = descriptionInputs()[0].parentElement as HTMLElement;
    expect(within(row).getByText(/dupe/i)).toBeInTheDocument();
    expect(within(row).getByText(/recur/i)).toBeInTheDocument();
  });

  it("counts pending in the summary bar alongside duplicates and recurring", async () => {
    mockCategoryFetch(twoCategories);
    renderWizard(
      twoCategories,
      vi.fn<CommitFn>().mockResolvedValue(undefined),
      makeAllFlagsPreview()
    );

    await gotoReview();

    // The summary bar shows all three tallies; pending is no longer counted in
    // silence.
    expect(await screen.findByText(/1 likely duplicate/i)).toBeInTheDocument();
    expect(screen.getByText(/1 recurring/i)).toBeInTheDocument();
    expect(screen.getByText(/1 pending/i)).toBeInTheDocument();
  });
});

/**
 * Issue #258 — Import Category Learning, Phase 1. A row whose Counterparty Key
 * has a Category Rule arrives in that category with the Category Source
 * `learned`, and the review table says so with a muted "Learned" chip beside
 * the picker. `chosen` and `unmatched` rows carry no chip. The chip is a third
 * axis beside the soft flags and the hard blocker: it never pre-unchecks a
 * row, never replaces a flag badge, and never gates the commit.
 */

/** Three included rows: learned, unmatched, and a learned likely duplicate. */
function makeLearningPreview(): ImportPreview {
  const base = makePreview();
  return {
    ...base,
    rows: [
      {
        id: "r0",
        date: "2026-03-05",
        description: "REWE",
        counterparty: "REWE",
        amount: -1299,
        category: "Food",
        categorySource: "learned",
      },
      {
        id: "r1",
        date: "2026-03-12",
        description: "Kiosk am Eck",
        counterparty: "Kiosk am Eck",
        amount: -450,
        category: "Miscellaneous",
        categorySource: "unmatched",
      },
      {
        id: "r2",
        date: "2026-03-14",
        description: "Gehalt",
        counterparty: "Gehalt",
        amount: 250000,
        category: "Income",
        categorySource: "learned",
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

const learningCategories: Category[] = [
  ...twoCategories,
  {
    id: "c-misc",
    name: "Miscellaneous",
    isDefault: true,
    color: "#909AAE",
    hidden: false,
  },
];

/** The review row holding the nth description input. */
const reviewRow = (n: number) =>
  descriptionInputs()[n].parentElement as HTMLElement;

/** Wait until every row's picker has loaded and reported its selection. */
async function settlePickers() {
  await screen.findAllByRole("option", { name: "Food" });
  await waitFor(() =>
    screen
      .getAllByLabelText(/^category$/i)
      .forEach((picker) => expect(picker).not.toBeDisabled())
  );
}

describe("ImportWizard — Learned chip (#258)", () => {
  it("shows Learned beside the picker on a learned row, and no chip on an unmatched row", async () => {
    mockCategoryFetch(learningCategories);
    renderWizard(
      learningCategories,
      vi.fn<CommitFn>().mockResolvedValue(undefined),
      makeLearningPreview()
    );

    await gotoReview();
    await settlePickers();

    expect(within(reviewRow(0)).getByText(/^learned$/i)).toBeInTheDocument();
    expect(within(reviewRow(1)).queryByText(/learned/i)).toBeNull();
  });

  it("drops the chip once the user picks a different category — a chosen row has none", async () => {
    mockCategoryFetch(learningCategories);
    const commit = vi.fn<CommitFn>().mockResolvedValue(undefined);
    renderWizard(learningCategories, commit, makeLearningPreview());

    await gotoReview();
    await settlePickers();
    expect(within(reviewRow(0)).getByText(/^learned$/i)).toBeInTheDocument();

    fireEvent.change(screen.getAllByLabelText(/^category$/i)[0], {
      target: { value: "c-income" },
    });

    await waitFor(() =>
      expect(within(reviewRow(0)).queryByText(/learned/i)).toBeNull()
    );

    fireEvent.click(
      screen.getByRole("button", { name: /import 2 transactions/i })
    );
    await waitFor(() => expect(commit).toHaveBeenCalledTimes(1));
    expect(commit.mock.calls[0][0].rows[0]).toMatchObject({
      category: "Income",
      categorySource: "chosen",
    });
  });

  it("keeps the chip apart from the flags: a learned duplicate shows both, and a learned row stays checked", async () => {
    mockCategoryFetch(learningCategories);
    renderWizard(
      learningCategories,
      vi.fn<CommitFn>().mockResolvedValue(undefined),
      makeLearningPreview()
    );

    await gotoReview();
    await settlePickers();

    // The learned duplicate carries both pieces of evidence, side by side.
    const dupe = reviewRow(2);
    expect(within(dupe).getByText(/^learned$/i)).toBeInTheDocument();
    expect(within(dupe).getByText(/dupe/i)).toBeInTheDocument();
    // Learned is not a reason to set a row aside: only the duplicate arrives
    // unchecked.
    const toggles = screen.getAllByRole("button", { name: "toggle" });
    expect(toggles[0]).toHaveAttribute("aria-pressed", "true");
    expect(toggles[2]).toHaveAttribute("aria-pressed", "false");
  });

  it("commits each untouched row with the source it arrived with, so fallback rows teach nothing", async () => {
    mockCategoryFetch(learningCategories);
    const commit = vi.fn<CommitFn>().mockResolvedValue(undefined);
    renderWizard(learningCategories, commit, makeLearningPreview());

    await gotoReview();
    await settlePickers();
    fireEvent.click(
      screen.getByRole("button", { name: /import 2 transactions/i })
    );

    await waitFor(() => expect(commit).toHaveBeenCalledTimes(1));
    expect(commit.mock.calls[0][0].rows).toEqual([
      {
        date: "2026-03-05",
        amount: -1299,
        description: "REWE",
        counterparty: "REWE",
        category: "Food",
        categorySource: "learned",
      },
      {
        date: "2026-03-12",
        amount: -450,
        description: "Kiosk am Eck",
        counterparty: "Kiosk am Eck",
        category: "Miscellaneous",
        categorySource: "unmatched",
      },
    ]);
  });
});

/**
 * Issue #260 — Keyword Groups. A row a Keyword Group matched arrives in the
 * user's category with the Category Source `suggested`, and the review table
 * marks it with a muted "Suggested" chip beside the picker. Committed as it
 * is, the row keeps its source, so the server learns a Category Rule from it.
 */

/** Two included rows: a keyword suggestion and an unmatched fallback. */
function makeSuggestedPreview(): ImportPreview {
  const learning = makeLearningPreview();
  return {
    ...learning,
    rows: [
      { ...learning.rows[0], categorySource: "suggested" },
      learning.rows[1],
    ],
    summary: { ...learning.summary, total: 2, duplicates: 0 },
  };
}

describe("ImportWizard — Suggested chip (#260)", () => {
  it("shows Suggested beside the picker on a suggested row, and no chip on an unmatched row", async () => {
    mockCategoryFetch(learningCategories);
    renderWizard(
      learningCategories,
      vi.fn<CommitFn>().mockResolvedValue(undefined),
      makeSuggestedPreview()
    );

    await gotoReview();
    await settlePickers();

    expect(within(reviewRow(0)).getByText(/^suggested$/i)).toBeInTheDocument();
    expect(within(reviewRow(0)).queryByText(/learned/i)).toBeNull();
    expect(within(reviewRow(1)).queryByText(/suggested/i)).toBeNull();
  });

  it("commits an untouched suggested row as suggested, so it teaches a Category Rule", async () => {
    mockCategoryFetch(learningCategories);
    const commit = vi.fn<CommitFn>().mockResolvedValue(undefined);
    renderWizard(learningCategories, commit, makeSuggestedPreview());

    await gotoReview();
    await settlePickers();
    expect(within(reviewRow(0)).getByText(/^suggested$/i)).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: /import 2 transactions/i })
    );

    await waitFor(() => expect(commit).toHaveBeenCalledTimes(1));
    expect(commit.mock.calls[0][0].rows[0]).toMatchObject({
      category: "Food",
      categorySource: "suggested",
    });
  });
});

/**
 * Issue #262 — Category Proposals. A row whose Keyword Group names a category
 * the user does not have arrives proposed: Miscellaneous, a "New: {name}"
 * chip beside the picker, and one strip above the table per proposed category
 * with its name, row count, Create category and Dismiss. Create makes the
 * category at once and moves the rows into it; Dismiss returns them to
 * Miscellaneous and the commit sends the name as a declined proposal. A
 * proposal never disables the commit.
 */

const dining: Category = {
  id: "c-dining",
  name: "Dining",
  isDefault: false,
  color: "#C9897F",
  hidden: false,
};

/** One learned row and two rows proposing Dining. */
function makeProposalPreview(): ImportPreview {
  const base = makeLearningPreview();
  const proposedRow = (id: string, payee: string, amount: number) => ({
    id,
    date: "2026-03-16",
    description: payee,
    counterparty: payee,
    amount,
    category: "Miscellaneous",
    categorySource: "proposed" as const,
    proposedCategory: "Dining",
  });
  return {
    ...base,
    rows: [
      base.rows[0],
      proposedRow("r1", "LIEFERANDO.DE", -2390),
      proposedRow("r2", "Pizzeria Muster", -1850),
    ],
    summary: { ...base.summary, total: 3, duplicates: 0 },
  };
}

/**
 * Categories API double that remembers a created category: GET answers the
 * list plus anything POSTed so far; POST answers `created`, or fails with
 * `failWith` when given.
 */
function mockCategoryApi(created: Category, failWith?: string) {
  const list = [...learningCategories];
  return vi
    .spyOn(globalThis, "fetch")
    .mockImplementation((_url: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === "POST") {
        if (failWith !== undefined) {
          return Promise.resolve({
            ok: false,
            status: 409,
            json: async () => ({ error: failWith }),
          } as Response);
        }
        list.push(created);
        return Promise.resolve({
          ok: true,
          status: 201,
          json: async () => created,
        } as Response);
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => [...list],
      } as Response);
    });
}

/** Elements whose text names a proposal and its row count. */
function proposalStrip(name: string, count: number) {
  const pattern = new RegExp(`New category: ${name}[^0-9]+${count} rows`, "i");
  return screen.queryAllByText((_, el) => pattern.test(el?.textContent ?? ""));
}

describe("ImportWizard — Category Proposals (#262)", () => {
  it("shows one strip per proposed category with its name and row count", async () => {
    mockCategoryApi(dining);
    renderWizard(
      learningCategories,
      vi.fn<CommitFn>().mockResolvedValue(undefined),
      makeProposalPreview()
    );

    await gotoReview();
    await settlePickers();

    expect(proposalStrip("Dining", 2).length).toBeGreaterThan(0);
    expect(
      screen.getAllByRole("button", { name: /create category/i })
    ).toHaveLength(1);
    expect(screen.getAllByRole("button", { name: /dismiss/i })).toHaveLength(1);
  });

  it("marks each proposed row with a New: {name} chip, and no other row", async () => {
    mockCategoryApi(dining);
    renderWizard(
      learningCategories,
      vi.fn<CommitFn>().mockResolvedValue(undefined),
      makeProposalPreview()
    );

    await gotoReview();
    await settlePickers();

    expect(within(reviewRow(1)).getByText(/^New: Dining$/)).toBeInTheDocument();
    expect(within(reviewRow(2)).getByText(/^New: Dining$/)).toBeInTheDocument();
    expect(within(reviewRow(0)).queryByText(/^New:/)).toBeNull();
  });

  it("never disables the commit: an undecided proposal commits its rows as Miscellaneous, declining nothing", async () => {
    mockCategoryApi(dining);
    const commit = vi.fn<CommitFn>().mockResolvedValue(undefined);
    renderWizard(learningCategories, commit, makeProposalPreview());

    await gotoReview();
    await settlePickers();
    // The proposal is on screen and undecided.
    expect(proposalStrip("Dining", 2).length).toBeGreaterThan(0);
    const importBtn = screen.getByRole("button", {
      name: /import 3 transactions/i,
    });
    expect(importBtn).not.toBeDisabled();
    fireEvent.click(importBtn);

    await waitFor(() => expect(commit).toHaveBeenCalledTimes(1));
    const input = commit.mock.calls[0][0] as CommitImportInput & {
      declinedProposals?: string[];
    };
    expect(input.rows[1]).toMatchObject({
      category: "Miscellaneous",
      categorySource: "proposed",
    });
    expect(input.declinedProposals ?? []).toEqual([]);
  });

  it("Create category creates it with a colour and moves the proposed rows into it", async () => {
    const fetchSpy = mockCategoryApi(dining);
    const commit = vi.fn<CommitFn>().mockResolvedValue(undefined);
    renderWizard(learningCategories, commit, makeProposalPreview());

    await gotoReview();
    await settlePickers();
    fireEvent.click(screen.getByRole("button", { name: /create category/i }));

    await waitFor(() =>
      expect(within(reviewRow(1)).queryByText(/^New:/)).toBeNull()
    );
    const posts = fetchSpy.mock.calls.filter(
      ([, init]) => init?.method === "POST"
    );
    expect(posts).toHaveLength(1);
    const body = JSON.parse(String(posts[0][1]?.body)) as {
      name: string;
      color?: string;
    };
    expect(body.name).toBe("Dining");
    expect(body.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(proposalStrip("Dining", 2)).toHaveLength(0);
    expect(within(reviewRow(1)).getByText(/^suggested$/i)).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: /import 3 transactions/i })
    );
    await waitFor(() => expect(commit).toHaveBeenCalledTimes(1));
    const input = commit.mock.calls[0][0];
    expect(input.rows[1]).toMatchObject({
      category: "Dining",
      categorySource: "suggested",
    });
    expect(input.rows[2]).toMatchObject({
      category: "Dining",
      categorySource: "suggested",
    });
  });

  it("keeps the strip and shows the error when the create fails", async () => {
    mockCategoryApi(dining, "Category already exists");
    renderWizard(
      learningCategories,
      vi.fn<CommitFn>().mockResolvedValue(undefined),
      makeProposalPreview()
    );

    await gotoReview();
    await settlePickers();
    fireEvent.click(screen.getByRole("button", { name: /create category/i }));

    expect(await screen.findByText(/already exists/i)).toBeInTheDocument();
    expect(proposalStrip("Dining", 2).length).toBeGreaterThan(0);
    expect(within(reviewRow(1)).getByText(/^New: Dining$/)).toBeInTheDocument();
  });

  it("Dismiss returns the rows to Miscellaneous and the commit sends the declined name", async () => {
    const fetchSpy = mockCategoryApi(dining);
    const commit = vi.fn<CommitFn>().mockResolvedValue(undefined);
    renderWizard(learningCategories, commit, makeProposalPreview());

    await gotoReview();
    await settlePickers();
    fireEvent.click(screen.getByRole("button", { name: /dismiss/i }));

    await waitFor(() =>
      expect(within(reviewRow(1)).queryByText(/^New:/)).toBeNull()
    );
    expect(proposalStrip("Dining", 2)).toHaveLength(0);
    expect(
      fetchSpy.mock.calls.filter(([, init]) => init?.method === "POST")
    ).toHaveLength(0);

    fireEvent.click(
      screen.getByRole("button", { name: /import 3 transactions/i })
    );
    await waitFor(() => expect(commit).toHaveBeenCalledTimes(1));
    const input = commit.mock.calls[0][0] as CommitImportInput & {
      declinedProposals?: string[];
    };
    expect(input.rows[1]).toMatchObject({
      category: "Miscellaneous",
      categorySource: "unmatched",
    });
    expect(input.declinedProposals).toEqual(["Dining"]);
  });
});

/**
 * Refactor 35, B1 — approving a Category Proposal while the category list
 * refetches. The tests above answer every GET at once; a real refetch leaves
 * a window in which the moved rows' pickers hold a value their list does not
 * hold yet. Approval must publish the new category before it moves the rows,
 * so no picker falls back to another category and reports it as a choice.
 */

/** Categories API double whose GETs after the POST never answer. */
function mockCategoryApiWithRefetchInFlight(created: Category) {
  let posted = false;
  return vi
    .spyOn(globalThis, "fetch")
    .mockImplementation((_url: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === "POST") {
        posted = true;
        return Promise.resolve({
          ok: true,
          status: 201,
          json: async () => created,
        } as Response);
      }
      if (posted) return new Promise<Response>(() => undefined);
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => [...learningCategories],
      } as Response);
    });
}

/**
 * The proposal preview plus an untouched row that shares the first proposed
 * row's Counterparty but matched no Keyword Group.
 */
function makeSharedCounterpartyProposalPreview(): ImportPreview {
  const base = makeProposalPreview();
  const payee = "Muster Zahlungsdienst GmbH";
  return {
    ...base,
    rows: [
      base.rows[0],
      { ...base.rows[1], counterparty: payee },
      base.rows[2],
      {
        id: "r3",
        date: "2026-03-18",
        description: "Erstattung",
        counterparty: payee,
        amount: 1200,
        category: "Miscellaneous",
        categorySource: "unmatched",
      },
    ],
    summary: { ...base.summary, total: 4 },
  };
}

describe("ImportWizard — approving a proposal while the list refetches (refactor 35)", () => {
  it("commits the proposed rows as suggested in the new category, and moves no other row", async () => {
    mockCategoryApiWithRefetchInFlight(dining);
    const commit = vi.fn<CommitFn>().mockResolvedValue(undefined);
    renderWizard(
      learningCategories,
      commit,
      makeSharedCounterpartyProposalPreview()
    );

    await gotoReview();
    await settlePickers();
    fireEvent.click(screen.getByRole("button", { name: /create category/i }));

    await waitFor(() => expect(proposalStrip("Dining", 2)).toHaveLength(0));

    fireEvent.click(
      screen.getByRole("button", { name: /import 4 transactions/i })
    );
    await waitFor(() => expect(commit).toHaveBeenCalledTimes(1));
    const rows = commit.mock.calls[0][0].rows;
    expect(rows[1]).toMatchObject({
      category: "Dining",
      categorySource: "suggested",
    });
    expect(rows[2]).toMatchObject({
      category: "Dining",
      categorySource: "suggested",
    });
    // The same-Counterparty row the user never touched is not swept along.
    expect(rows[3]).toMatchObject({
      category: "Miscellaneous",
      categorySource: "unmatched",
    });
  });
});

/**
 * Same-Counterparty Propagation (#263): one correction in review moves every
 * same-Counterparty-Key row the user has not touched, the followed rows'
 * pickers show it, and the whole group commits as `chosen` — so the commit
 * teaches the Category Rule. Rendering the pickers is never a change.
 */

const shopping: Category = {
  id: "c-shopping",
  name: "Shopping",
  isDefault: false,
  color: "#B58BD1",
  hidden: false,
};

const amazonCategories: Category[] = [...learningCategories, shopping];

/** One learned REWE row, then ten Amazon rows that landed in Miscellaneous. */
function makeAmazonPreview(): ImportPreview {
  const base = makeLearningPreview();
  const amazonRows = Array.from({ length: 10 }, (_, i) => ({
    id: `a${i}`,
    date: `2026-03-${String(i + 10).padStart(2, "0")}`,
    description: `AMAZON EU S.A.R.L., 30${i}-1234567-765432${i}`,
    counterparty: `AMAZON EU S.A.R.L., 30${i}-1234567-765432${i}`,
    amount: -(1000 + i * 111),
    category: "Miscellaneous",
    categorySource: "unmatched" as const,
  }));
  return {
    ...base,
    rows: [base.rows[0], ...amazonRows],
    summary: { ...base.summary, total: 11, duplicates: 0 },
  };
}

describe("ImportWizard — Same-Counterparty Propagation (#263)", () => {
  it("opening the review step marks no row chosen", async () => {
    mockCategoryFetch(learningCategories);
    const commit = vi.fn<CommitFn>().mockResolvedValue(undefined);
    renderWizard(learningCategories, commit, makeLearningPreview());

    await gotoReview();
    await settlePickers();

    fireEvent.click(
      screen.getByRole("button", { name: /import 2 transactions/i })
    );
    await waitFor(() => expect(commit).toHaveBeenCalledTimes(1));
    expect(commit.mock.calls[0][0].rows.map((r) => r.categorySource)).toEqual([
      "learned",
      "unmatched",
    ]);
  });

  it("the followed rows' pickers show the propagated category", async () => {
    mockCategoryFetch(amazonCategories);
    renderWizard(
      amazonCategories,
      vi.fn<CommitFn>().mockResolvedValue(undefined),
      makeAmazonPreview()
    );

    await gotoReview();
    await settlePickers();

    fireEvent.change(screen.getAllByLabelText(/^category$/i)[1], {
      target: { value: "c-shopping" },
    });

    await waitFor(() => {
      const pickers = screen.getAllByLabelText(/^category$/i);
      pickers.slice(1).forEach((p) => expect(p).toHaveValue("c-shopping"));
    });
    // The REWE row is another payee and keeps its own category.
    expect(screen.getAllByLabelText(/^category$/i)[0]).toHaveValue("c-food");
  });

  it("ten Amazon rows need one correction, and all ten commit as chosen to teach the rule", async () => {
    mockCategoryFetch(amazonCategories);
    const commit = vi.fn<CommitFn>().mockResolvedValue(undefined);
    renderWizard(amazonCategories, commit, makeAmazonPreview());

    await gotoReview();
    await settlePickers();

    fireEvent.change(screen.getAllByLabelText(/^category$/i)[4], {
      target: { value: "c-shopping" },
    });
    await waitFor(() =>
      expect(screen.getAllByLabelText(/^category$/i)[10]).toHaveValue(
        "c-shopping"
      )
    );

    fireEvent.click(
      screen.getByRole("button", { name: /import 11 transactions/i })
    );
    await waitFor(() => expect(commit).toHaveBeenCalledTimes(1));

    const [rewe, ...amazon] = commit.mock.calls[0][0].rows;
    expect(rewe).toMatchObject({ category: "Food", categorySource: "learned" });
    expect(amazon).toHaveLength(10);
    amazon.forEach((r) =>
      expect(r).toMatchObject({
        category: "Shopping",
        categorySource: "chosen",
      })
    );
  });
});

// Issue #274 (Audit Finding 24) — the Map columns hint is an icon beside one
// sentence. The sentence wraps as a paragraph, so its words and the bank name
// sit in one inline text run rather than three flex columns.
describe("ImportWizard — Map columns hint reads as one sentence (#274)", () => {
  it("renders the remembered-mapping sentence as one text run beside its icon", async () => {
    mockCategoryFetch([]);
    renderWizard([], vi.fn<CommitFn>());
    const mapBtn = await screen.findByRole("button", { name: /map columns/i });
    await waitFor(() => expect(mapBtn).not.toBeDisabled());
    fireEvent.click(mapBtn);

    const sentence =
      "Mapping remembered from your last DKB import — adjust if the columns changed.";
    const run = screen.getByText(
      (_, el) =>
        el?.textContent?.replace(/\s+/g, " ").trim() === sentence &&
        !Array.from(el.children).some(
          (c) => c.textContent?.replace(/\s+/g, " ").trim() === sentence
        )
    );

    expect(getComputedStyle(run).display).not.toMatch(/flex|grid/);
    expect(getComputedStyle(run.parentElement as Element).display).toMatch(
      /flex/
    );
  });
});

// Refactor #278 (Audit Finding 4) — the step-one account chips keep the
// ChoiceChip's contract: an aria-pressed button at Control Height sm.
describe("ImportWizard — account chips are ChoiceChips", () => {
  it("renders each account as an aria-pressed button at the sm Control Height", async () => {
    mockCategoryFetch([]);
    renderWizard([], vi.fn<CommitFn>());
    const chip = await screen.findByRole("button", { name: "Main" });
    expect(chip).toHaveAttribute("aria-pressed");
    expect(getComputedStyle(chip).height).toBe(`${theme.sizing.control.sm}px`);
  });
});

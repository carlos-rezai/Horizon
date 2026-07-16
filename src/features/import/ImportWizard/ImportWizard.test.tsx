// @vitest-environment jsdom
import {
  render,
  screen,
  cleanup,
  fireEvent,
  waitFor,
} from "@testing-library/react";
import { describe, it, expect, afterEach, vi, type Mock } from "vitest";
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
    summary: { total: 2, duplicates: 0, recurring: 1, pending: 0, rejected: 0 },
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

function renderWizard(categories: Category[], commit: Mock<CommitFn>) {
  const preview = vi.fn<PreviewFn>().mockResolvedValue(makePreview());
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
  fireEvent.click(screen.getByRole("button", { name: /review 2 rows/i }));
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

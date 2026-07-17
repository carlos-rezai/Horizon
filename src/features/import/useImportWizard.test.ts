// @vitest-environment jsdom
import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, type Mock } from "vitest";
import { useImportWizard } from "./useImportWizard";
import type { AccountWithBalance } from "../../types/account";
import type { Category } from "../../types/category";
import type { CommitImportInput, ImportPreview } from "./importTypes";

// The exact param signatures useImportWizard expects. Typing the mocks against
// these (rather than the loose `Mock<Procedure>` of a bare `vi.fn()`) keeps the
// stubs assignable to the hook's params; a real signature change fails here.
type PreviewFn = (accountId: string, file: File) => Promise<ImportPreview>;
type CommitFn = (input: CommitImportInput) => Promise<void>;
type OnCloseFn = () => void;
type OnDoneFn = (result: {
  account: AccountWithBalance;
  included: number;
  skipped: number;
}) => void;

const accounts: AccountWithBalance[] = [
  {
    id: "acc-1",
    kind: "Girokonto",
    name: "Main",
    openingBalance: 0,
    openingDate: "2026-01-01",
    balance: 0,
  },
  {
    id: "acc-2",
    kind: "Tagesgeld",
    name: "Savings",
    openingBalance: 0,
    openingDate: "2026-01-01",
    balance: 0,
  },
];

const categories: Category[] = [
  { id: "c1", name: "Food", isDefault: true, color: "#74C29B", hidden: false },
  {
    id: "c2",
    name: "Income",
    isDefault: false,
    color: "#7FA7D9",
    hidden: false,
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

function setup(
  overrides: {
    preview?: Mock<PreviewFn>;
    commit?: Mock<CommitFn>;
    onClose?: Mock<OnCloseFn>;
    onDone?: Mock<OnDoneFn>;
  } = {}
) {
  const preview =
    overrides.preview ?? vi.fn<PreviewFn>().mockResolvedValue(makePreview());
  const commit =
    overrides.commit ?? vi.fn<CommitFn>().mockResolvedValue(undefined);
  const onClose = overrides.onClose ?? vi.fn<OnCloseFn>();
  const onDone = overrides.onDone ?? vi.fn<OnDoneFn>();

  const hook = renderHook(() =>
    useImportWizard({
      importAccounts: accounts,
      categories,
      file,
      presetAccountId: null,
      preview,
      commit,
      onClose,
      onDone,
    })
  );
  return { ...hook, preview, commit, onClose, onDone };
}

describe("useImportWizard — preview lifecycle", () => {
  it("loads a preview for the default account on mount", async () => {
    const { result, preview } = setup();

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(preview).toHaveBeenCalledWith("acc-1", file);
    expect(result.current.data?.bank).toBe("DKB");
    expect(result.current.rows).toHaveLength(2);
    // The recurring row is pre-unchecked; the clean one is included.
    expect(result.current.summary.included).toBe(1);
    expect(result.current.map).toEqual(makePreview().mapping);
  });

  it("re-fetches the preview when a different account is selected", async () => {
    const { result, preview } = setup();
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.selectAccount("acc-2"));

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(preview).toHaveBeenLastCalledWith("acc-2", file);
    expect(result.current.accountId).toBe("acc-2");
  });

  it("surfaces a load error and blocks navigation", async () => {
    const preview = vi
      .fn<PreviewFn>()
      .mockRejectedValue(new Error("Could not read"));
    const { result } = setup({ preview });

    await waitFor(() =>
      expect(result.current.loadError).toBe("Could not read")
    );
    expect(result.current.blocked).toBe(true);
  });
});

describe("useImportWizard — row editing", () => {
  it("toggle flips a row's inclusion and updates the summary", async () => {
    const { result } = setup();
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.summary.included).toBe(1);
    // Re-include the pre-unchecked recurring row.
    act(() => result.current.toggle("r1"));
    expect(result.current.summary.included).toBe(2);
  });

  it("setCategory changes a row's category", async () => {
    const { result } = setup();
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setCategory("r0", "Subscriptions"));
    expect(result.current.rows.find((r) => r.id === "r0")?.category).toBe(
      "Subscriptions"
    );
  });

  it("categoryOptions merges configured categories with row-assigned ones", async () => {
    const { result } = setup();
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.categoryOptions).toContain("Food");
    expect(result.current.categoryOptions).toContain("Income");
  });
});

describe("useImportWizard — commit", () => {
  it("commits only the included rows with the data-layer field names", async () => {
    const { result, commit, onDone, onClose } = setup();
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.confirm();
    });

    expect(commit).toHaveBeenCalledTimes(1);
    const payload = commit.mock.calls[0][0];
    expect(payload).toMatchObject({
      accountId: "acc-1",
      bank: "DKB",
      filename: "dkb-2026-03.csv",
      // The full format is echoed back so the bank's preset round-trips it.
      delimiter: ";",
      decimal: ",",
      dateFmt: "DD.MM.YYYY",
    });
    // Only the one included (non-recurring) row, mapped to description/category.
    expect(payload.rows).toEqual([
      {
        date: "2026-03-05",
        amount: -1299,
        description: "REWE",
        category: "Food",
      },
    ]);
    expect(onDone).toHaveBeenCalledWith({
      account: accounts[0],
      included: 1,
      skipped: 1,
    });
    expect(onClose).toHaveBeenCalled();
  });

  it("surfaces a commit failure and does not close", async () => {
    const commit = vi
      .fn<CommitFn>()
      .mockRejectedValue(new Error("Failed to import"));
    const { result, onClose } = setup({ commit });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.confirm();
    });

    expect(result.current.submitError).toBe("Failed to import");
    expect(result.current.submitting).toBe(false);
    expect(onClose).not.toHaveBeenCalled();
  });
});

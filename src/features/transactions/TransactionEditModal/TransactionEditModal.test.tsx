// @vitest-environment jsdom
import {
  render,
  screen,
  cleanup,
  fireEvent,
  waitFor,
} from "@testing-library/react";
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { ThemeProvider } from "styled-components";
import { theme } from "../../../tokens";
import TransactionEditModal from "./TransactionEditModal";
import type { Transaction } from "../../../types/transaction";
import type { AccountWithBalance } from "../../../types/account";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const regularTransaction: Transaction = {
  id: "txn-1",
  accountId: "acc-1",
  date: "2026-03-01",
  amount: -5000,
  description: "Groceries",
  category: "Groceries",
};

const transferTransaction: Transaction = {
  id: "txn-2",
  accountId: "acc-1",
  date: "2026-03-10",
  amount: -50000,
  description: "Savings deposit",
  category: "Transfer",
  transferId: "transfer-abc",
};

const account: AccountWithBalance = {
  id: "acc-1",
  kind: "Girokonto",
  name: "Main",
  openingBalance: 0,
  openingDate: "2026-01-01",
  balance: 100000,
  color: "#7FA7D9",
};

/** A fetch mock that returns categories for GET /categories and `opResponse`
 *  for every other call (PATCH/DELETE). */
function mockFetch(
  opResponse: Partial<Response> & { json: () => Promise<unknown> },
  categories: { id: string; name: string; isDefault: boolean }[] = []
) {
  return vi
    .spyOn(globalThis, "fetch")
    .mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input ?? "");
      if (url.endsWith("/categories") && (!init || !init.method)) {
        return Promise.resolve({
          ok: true,
          json: async () => categories,
        } as Response);
      }
      return Promise.resolve(opResponse as Response);
    });
}

const renderModal = (
  transaction: Transaction,
  overrides: Partial<{
    accounts: AccountWithBalance[];
    toAccountName: string;
    onClose: () => void;
    onSaved: (tx: Transaction) => void;
    onDeleted: (id: string, transferId?: string) => void;
  }> = {}
) => {
  const props = {
    transaction,
    onClose: vi.fn(),
    onSaved: vi.fn(),
    onDeleted: vi.fn(),
    ...overrides,
  };
  render(
    <ThemeProvider theme={theme}>
      <TransactionEditModal {...props} />
    </ThemeProvider>
  );
  return props;
};

describe("TransactionEditModal — pre-population", () => {
  beforeEach(() => mockFetch({ ok: true, json: async () => ({}) }));

  it("renders the modal title", () => {
    renderModal(regularTransaction);
    expect(
      screen.getByRole("heading", { name: /edit transaction/i })
    ).toBeInTheDocument();
  });

  it("pre-populates the date field with the transaction's date", () => {
    renderModal(regularTransaction);
    const dateInput = screen.getByLabelText(/date/i) as HTMLInputElement;
    expect(dateInput.value).toBe("01.03.2026");
  });

  it("pre-populates the description field", () => {
    renderModal(regularTransaction);
    const descInput = screen.getByLabelText(/description/i) as HTMLInputElement;
    expect(descInput.value).toBe("Groceries");
  });

  it("pre-populates the amount as a magnitude and selects Outflow for a negative amount", () => {
    renderModal(regularTransaction);
    const amountInput = screen.getByLabelText(/amount/i) as HTMLInputElement;
    expect(parseFloat(amountInput.value)).toBeCloseTo(50.0);
    expect(screen.getByRole("button", { name: "Outflow" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
  });

  it("shows the source account on the 'On' line when accounts are provided", () => {
    renderModal(regularTransaction, { accounts: [account] });
    expect(screen.getByText("Main")).toBeInTheDocument();
  });
});

describe("TransactionEditModal — save", () => {
  it("PATCHes /transactions/:id with a negative amount for Outflow", async () => {
    const spy = mockFetch({
      ok: true,
      json: async () => ({ ...regularTransaction }),
    });
    renderModal(regularTransaction);

    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      const patch = spy.mock.calls.find(
        ([url, init]) =>
          typeof url === "string" &&
          url.includes("/transactions/txn-1") &&
          (init as RequestInit)?.method === "PATCH"
      );
      expect(patch).toBeDefined();
      const body = JSON.parse((patch![1] as RequestInit).body as string);
      expect(body.amount).toBe(-5000);
    });
  });

  it("PATCHes a positive amount after switching to Inflow", async () => {
    const spy = mockFetch({
      ok: true,
      json: async () => ({ ...regularTransaction }),
    });
    renderModal(regularTransaction);

    fireEvent.click(screen.getByRole("button", { name: "Inflow" }));
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      const patch = spy.mock.calls.find(
        ([url, init]) =>
          typeof url === "string" &&
          url.includes("/transactions/txn-1") &&
          (init as RequestInit)?.method === "PATCH"
      );
      const body = JSON.parse((patch![1] as RequestInit).body as string);
      expect(body.amount).toBe(5000);
    });
  });

  it("calls onSaved then onClose after a successful save", async () => {
    mockFetch({ ok: true, json: async () => ({ ...regularTransaction }) });
    const onSaved = vi.fn();
    const onClose = vi.fn();
    renderModal(regularTransaction, { onSaved, onClose });

    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(onSaved).toHaveBeenCalledWith(
        expect.objectContaining({ id: "txn-1" })
      );
      expect(onClose).toHaveBeenCalled();
    });
  });
});

describe("TransactionEditModal — category", () => {
  it("PATCHes the selected category name", async () => {
    const spy = mockFetch({ ok: true, json: async () => regularTransaction }, [
      { id: "c1", name: "Groceries", isDefault: true },
      { id: "c2", name: "Dining", isDefault: true },
    ]);
    renderModal(regularTransaction);

    await screen.findByRole("button", { name: "Dining" });
    fireEvent.click(screen.getByRole("button", { name: "Dining" }));
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      const patch = spy.mock.calls.find(
        ([url, init]) =>
          typeof url === "string" &&
          url.includes("/transactions/txn-1") &&
          (init as RequestInit)?.method === "PATCH"
      );
      const body = JSON.parse((patch![1] as RequestInit).body as string);
      expect(body.category).toBe("Dining");
    });
  });
});

describe("TransactionEditModal — server error on save", () => {
  beforeEach(() =>
    mockFetch({ ok: false, json: async () => ({ error: "Update failed" }) })
  );

  it("shows an inline error and does not close when save fails", async () => {
    const onClose = vi.fn();
    renderModal(regularTransaction, { onClose });

    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    expect(await screen.findByText(/update failed/i)).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe("TransactionEditModal — delete (non-transfer)", () => {
  it("confirms, DELETEs /transactions/:id, then calls onDeleted + onClose", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const spy = mockFetch({ ok: true, json: async () => ({}) });
    const onDeleted = vi.fn();
    const onClose = vi.fn();
    renderModal(regularTransaction, { onDeleted, onClose });

    fireEvent.click(screen.getByRole("button", { name: /delete/i }));

    await waitFor(() => {
      const del = spy.mock.calls.find(
        ([url, init]) =>
          typeof url === "string" &&
          url.includes("/transactions/txn-1") &&
          (init as RequestInit)?.method === "DELETE"
      );
      expect(del).toBeDefined();
      expect(onDeleted).toHaveBeenCalledWith("txn-1", undefined);
      expect(onClose).toHaveBeenCalled();
    });
  });

  it("does not call the API when confirmation is cancelled", () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const spy = mockFetch({ ok: true, json: async () => ({}) });
    renderModal(regularTransaction);

    fireEvent.click(screen.getByRole("button", { name: /delete/i }));

    const deletes = spy.mock.calls.filter(
      ([, init]) => (init as RequestInit)?.method === "DELETE"
    );
    expect(deletes).toHaveLength(0);
  });

  it("shows an inline error when delete fails", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    mockFetch({ ok: false, json: async () => ({ error: "Delete failed" }) });
    renderModal(regularTransaction);

    fireEvent.click(screen.getByRole("button", { name: /delete/i }));

    expect(await screen.findByText(/delete failed/i)).toBeInTheDocument();
  });
});

describe("TransactionEditModal — transfer branch", () => {
  beforeEach(() => mockFetch({ ok: true, json: async () => ({}) }));

  it("renders the two-leg note", () => {
    renderModal(transferTransaction);
    expect(screen.getByText(/both legs/i)).toBeInTheDocument();
  });

  it("hides Save changes and disables the editable fields for a transfer leg", () => {
    renderModal(transferTransaction);
    expect(
      screen.queryByRole("button", { name: /save changes/i })
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeDisabled();
    expect(screen.getByLabelText(/amount/i)).toBeDisabled();
  });

  it("DELETEs /transfers/:transferId and reports both ids", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const spy = mockFetch({ ok: true, json: async () => ({}) });
    const onDeleted = vi.fn();
    renderModal(transferTransaction, { onDeleted });

    fireEvent.click(screen.getByRole("button", { name: /delete/i }));

    await waitFor(() => {
      const del = spy.mock.calls.find(
        ([url, init]) =>
          typeof url === "string" &&
          url.includes("/transfers/transfer-abc") &&
          (init as RequestInit)?.method === "DELETE"
      );
      expect(del).toBeDefined();
      expect(onDeleted).toHaveBeenCalledWith("txn-2", "transfer-abc");
    });
  });

  it("shows the destination account name when toAccountName is provided", () => {
    renderModal(transferTransaction, { toAccountName: "DKB Reserve" });
    expect(screen.getByText("DKB Reserve")).toBeInTheDocument();
  });
});

describe("TransactionEditModal — overlay", () => {
  beforeEach(() => mockFetch({ ok: true, json: async () => ({}) }));

  it("calls onClose when the overlay backdrop is clicked", () => {
    const onClose = vi.fn();
    renderModal(regularTransaction, { onClose });
    fireEvent.click(screen.getByTestId("modal-overlay"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

// @vitest-environment jsdom
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { ThemeProvider } from "styled-components";
import { theme } from "../../../tokens";
import TransactionEditModal from "./TransactionEditModal";
import type { Transaction } from "../../../types/transaction";
import type { AccountWithBalance } from "../../../types/account";
import type { TransactionChanges } from "../../../utils/optimisticTransactions/optimisticTransactions";

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

/** The modal only reads categories; nothing it does writes to the server. */
function mockCategories(
  categories: { id: string; name: string; isDefault: boolean }[] = []
) {
  return vi.spyOn(globalThis, "fetch").mockResolvedValue({
    ok: true,
    json: async () => categories,
  } as Response);
}

beforeEach(() => mockCategories());

const renderModal = (
  transaction: Transaction,
  overrides: Partial<{
    accounts: AccountWithBalance[];
    toAccountName: string;
    onClose: () => void;
    onSave: (changes: TransactionChanges) => void;
    onDelete: () => void;
  }> = {}
) => {
  const props = {
    transaction,
    onClose: vi.fn(),
    onSave: vi.fn(),
    onDelete: vi.fn(),
    ...overrides,
  };
  render(
    <ThemeProvider theme={theme}>
      <TransactionEditModal {...props} />
    </ThemeProvider>
  );
  return props;
};

const save = () =>
  fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

describe("TransactionEditModal — pre-population", () => {
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
  it("hands over a negative amount for Outflow", () => {
    const { onSave } = renderModal(regularTransaction);

    save();

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ amount: -5000 })
    );
  });

  it("hands over a positive amount after switching to Inflow", () => {
    const { onSave } = renderModal(regularTransaction);

    fireEvent.click(screen.getByRole("button", { name: "Inflow" }));
    save();

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 5000 })
    );
  });

  it("hands over the edited description and date", () => {
    const { onSave } = renderModal(regularTransaction);

    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: "Groceries (corrected)" },
    });
    save();

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        description: "Groceries (corrected)",
        date: "2026-03-01",
      })
    );
  });

  it("never writes to the server itself", () => {
    renderModal(regularTransaction);

    save();

    const writes = vi
      .mocked(fetch)
      .mock.calls.filter(([, init]) => (init as RequestInit)?.method);
    expect(writes).toHaveLength(0);
  });
});

describe("TransactionEditModal — category", () => {
  it("hands over the selected category name", async () => {
    mockCategories([
      { id: "c1", name: "Groceries", isDefault: true },
      { id: "c2", name: "Dining", isDefault: true },
    ]);
    const { onSave } = renderModal(regularTransaction);

    await screen.findByRole("button", { name: "Dining" });
    fireEvent.click(screen.getByRole("button", { name: "Dining" }));
    save();

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ category: "Dining" })
    );
  });
});

describe("TransactionEditModal — delete (non-transfer)", () => {
  it("confirms, then asks the page to delete the transaction", () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const { onDelete } = renderModal(regularTransaction);

    fireEvent.click(screen.getByRole("button", { name: /delete/i }));

    expect(onDelete).toHaveBeenCalled();
  });

  it("deletes nothing when confirmation is cancelled", () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const { onDelete } = renderModal(regularTransaction);

    fireEvent.click(screen.getByRole("button", { name: /delete/i }));

    expect(onDelete).not.toHaveBeenCalled();
  });
});

describe("TransactionEditModal — transfer branch", () => {
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

  it("asks the page to delete a transfer leg once confirmed", () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const { onDelete } = renderModal(transferTransaction);

    fireEvent.click(screen.getByRole("button", { name: /delete/i }));

    expect(onDelete).toHaveBeenCalled();
  });

  it("shows the destination account name when toAccountName is provided", () => {
    renderModal(transferTransaction, { toAccountName: "DKB Reserve" });
    expect(screen.getByText("DKB Reserve")).toBeInTheDocument();
  });
});

describe("TransactionEditModal — overlay", () => {
  it("calls onClose when the overlay backdrop is clicked", () => {
    const { onClose } = renderModal(regularTransaction);
    fireEvent.click(screen.getByTestId("modal-overlay"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

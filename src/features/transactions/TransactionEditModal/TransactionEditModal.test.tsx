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
  category: "Food",
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

const renderModal = (
  transaction: Transaction,
  overrides: Partial<{
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
  it("pre-populates the date field with the transaction's date", () => {
    renderModal(regularTransaction);

    const dateInput = screen.getByLabelText(/date/i) as HTMLInputElement;
    expect(dateInput.value).toBe("2026-03-01");
  });

  it("pre-populates the description field with the transaction's description", () => {
    renderModal(regularTransaction);

    const descInput = screen.getByLabelText(/description/i) as HTMLInputElement;
    expect(descInput.value).toBe("Groceries");
  });

  it("pre-populates the amount field in euros with the transaction's amount", () => {
    renderModal(regularTransaction);

    // -5000 cents = -50.00 euros
    const amountInput = screen.getByLabelText(/amount/i) as HTMLInputElement;
    expect(parseFloat(amountInput.value)).toBeCloseTo(-50.0);
  });
});

describe("TransactionEditModal — save", () => {
  beforeEach(() => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        ...regularTransaction,
        description: "Groceries (updated)",
      }),
    } as Response);
  });

  it("calls PATCH /transactions/:id on save", async () => {
    renderModal(regularTransaction);

    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      const patchCall = vi
        .mocked(fetch)
        .mock.calls.find(
          ([url, init]) =>
            typeof url === "string" &&
            url.includes("/transactions/txn-1") &&
            (init as RequestInit)?.method === "PATCH"
        );
      expect(patchCall).toBeDefined();
    });
  });

  it("calls onSaved with the updated transaction after a successful save", async () => {
    const onSaved = vi.fn();
    renderModal(regularTransaction, { onSaved });

    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      expect(onSaved).toHaveBeenCalledWith(
        expect.objectContaining({ id: "txn-1" })
      );
    });
  });

  it("calls onClose after a successful save", async () => {
    const onClose = vi.fn();
    renderModal(regularTransaction, { onClose });

    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
  });
});

describe("TransactionEditModal — server error on save", () => {
  beforeEach(() => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Update failed" }),
    } as Response);
  });

  it("shows an inline error when save fails", async () => {
    renderModal(regularTransaction);

    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    expect(await screen.findByText(/update failed/i)).toBeInTheDocument();
  });

  it("does not call onClose when save fails", async () => {
    const onClose = vi.fn();
    renderModal(regularTransaction, { onClose });

    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    await screen.findByText(/update failed/i);
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe("TransactionEditModal — delete (non-transfer)", () => {
  beforeEach(() => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({}),
    } as Response);
  });

  it("prompts for confirmation before deleting", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    renderModal(regularTransaction);

    fireEvent.click(screen.getByRole("button", { name: /delete/i }));

    expect(confirmSpy).toHaveBeenCalled();
  });

  it("does not call the API when the user cancels the confirmation", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    renderModal(regularTransaction);

    fireEvent.click(screen.getByRole("button", { name: /delete/i }));

    const deleteCalls = vi
      .mocked(fetch)
      .mock.calls.filter(
        ([, init]) => (init as RequestInit)?.method === "DELETE"
      );
    expect(deleteCalls).toHaveLength(0);
  });

  it("calls DELETE /transactions/:id after confirmed delete", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    renderModal(regularTransaction);

    fireEvent.click(screen.getByRole("button", { name: /delete/i }));

    await waitFor(() => {
      const deleteCall = vi
        .mocked(fetch)
        .mock.calls.find(
          ([url, init]) =>
            typeof url === "string" &&
            url.includes("/transactions/txn-1") &&
            (init as RequestInit)?.method === "DELETE"
        );
      expect(deleteCall).toBeDefined();
    });
  });

  it("calls onDeleted with the transaction id after a successful delete", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const onDeleted = vi.fn();
    renderModal(regularTransaction, { onDeleted });

    fireEvent.click(screen.getByRole("button", { name: /delete/i }));

    await waitFor(() => {
      expect(onDeleted).toHaveBeenCalledWith("txn-1", undefined);
    });
  });

  it("calls onClose after a successful delete", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const onClose = vi.fn();
    renderModal(regularTransaction, { onClose });

    fireEvent.click(screen.getByRole("button", { name: /delete/i }));

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
  });
});

describe("TransactionEditModal — server error on delete", () => {
  it("shows an inline error when delete fails", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Delete failed" }),
    } as Response);

    renderModal(regularTransaction);

    fireEvent.click(screen.getByRole("button", { name: /delete/i }));

    expect(await screen.findByText(/delete failed/i)).toBeInTheDocument();
  });

  it("does not call onClose when delete fails", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Delete failed" }),
    } as Response);

    const onClose = vi.fn();
    renderModal(regularTransaction, { onClose });

    fireEvent.click(screen.getByRole("button", { name: /delete/i }));

    await screen.findByText(/delete failed/i);
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe("TransactionEditModal — transfer branch", () => {
  it("renders the two-leg note when the transaction has a transferId", () => {
    renderModal(transferTransaction);

    expect(
      screen.getByText(/both legs|two.leg|transfer.*delete.*remove/i)
    ).toBeInTheDocument();
  });

  it("renders the fields as non-editable when the transaction has a transferId", () => {
    renderModal(transferTransaction);

    const inputs = screen
      .getAllByRole("textbox")
      .concat(screen.queryAllByRole("spinbutton"));

    inputs.forEach((input) => {
      expect(input).toBeDisabled();
    });
  });

  it("calls DELETE /transfers/:transferId when deleting a transfer entry", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({}),
    } as Response);

    renderModal(transferTransaction);

    fireEvent.click(screen.getByRole("button", { name: /delete/i }));

    await waitFor(() => {
      const deleteCall = vi
        .mocked(fetch)
        .mock.calls.find(
          ([url, init]) =>
            typeof url === "string" &&
            url.includes("/transfers/transfer-abc") &&
            (init as RequestInit)?.method === "DELETE"
        );
      expect(deleteCall).toBeDefined();
    });
  });

  it("calls onDeleted with the id and transferId after a successful transfer delete", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({}),
    } as Response);

    const onDeleted = vi.fn();
    renderModal(transferTransaction, { onDeleted });

    fireEvent.click(screen.getByRole("button", { name: /delete/i }));

    await waitFor(() => {
      expect(onDeleted).toHaveBeenCalledWith("txn-2", "transfer-abc");
    });
  });
});

describe("TransactionEditModal — overlay", () => {
  it("calls onClose when the overlay backdrop is clicked", () => {
    const onClose = vi.fn();
    renderModal(regularTransaction, { onClose });

    fireEvent.click(screen.getByTestId("modal-overlay"));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

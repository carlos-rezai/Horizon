// @vitest-environment jsdom
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { ThemeProvider } from "styled-components";
import { theme } from "../../../tokens";
import RecurringTransactionModal from "./RecurringTransactionModal";
import type { RecurringTransaction } from "../../../types/recurring";
import type { AccountWithBalance } from "../../../types/account";
import type { Category } from "../../../types/category";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const categories: Category[] = [
  {
    id: "cat-1",
    name: "Housing",
    isDefault: true,
    color: "#7FA7D9",
    hidden: false,
  },
];

const otherAccounts: AccountWithBalance[] = [
  {
    id: "acc-2",
    kind: "Tagesgeld",
    name: "DKB Reserve",
    openingBalance: 200000,
    openingDate: "2026-01-01",
    balance: 220000,
  },
  {
    id: "acc-3",
    kind: "Mortgage",
    name: "Home Loan",
    openingBalance: -30000000,
    openingDate: "2020-01-01",
    balance: -28000000,
  },
];

const existingRt: RecurringTransaction = {
  id: "rt-1",
  accountId: "acc-1",
  amount: -120000,
  description: "Rent",
  category: "Housing",
  frequency: "monthly",
  dayOfMonth: 1,
};

const renderCreateModal = (
  overrides: Partial<
    React.ComponentProps<typeof RecurringTransactionModal>
  > = {}
) => {
  const props = {
    accountId: "acc-1",
    otherAccounts,
    onClose: vi.fn(),
    onSaved: vi.fn(),
    onDeleted: vi.fn(),
    ...overrides,
  };
  render(
    <ThemeProvider theme={theme}>
      <RecurringTransactionModal {...props} />
    </ThemeProvider>
  );
  return props;
};

const renderEditModal = (
  overrides: Partial<
    React.ComponentProps<typeof RecurringTransactionModal>
  > = {}
) => {
  const props = {
    accountId: "acc-1",
    transaction: existingRt,
    otherAccounts,
    onClose: vi.fn(),
    onSaved: vi.fn(),
    onDeleted: vi.fn(),
    ...overrides,
  };
  render(
    <ThemeProvider theme={theme}>
      <RecurringTransactionModal {...props} />
    </ThemeProvider>
  );
  return props;
};

const transferSelect = () =>
  screen.getByRole("combobox", { name: /^transfer/i });

const TRANSFER_SIGN_MESSAGE =
  "Enter the transfer amount as a positive number — the direction sets which way it moves.";

const fillTransfer = (amount: string, linked: string) => {
  fireEvent.change(screen.getByLabelText(/amount/i), {
    target: { value: amount },
  });
  fireEvent.change(screen.getByLabelText(/description/i), {
    target: { value: "Savings transfer" },
  });
  fireEvent.change(transferSelect(), { target: { value: linked } });
};

const save = () =>
  fireEvent.click(screen.getByRole("button", { name: /save|add|create/i }));

describe("RecurringTransactionModal — Transfer select", () => {
  beforeEach(() => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => categories,
    } as Response);
  });

  it("renders a Transfer select in place of Transfer to account", () => {
    renderCreateModal();

    expect(transferSelect()).toBeInTheDocument();
    expect(
      screen.queryByLabelText(/transfer to account/i)
    ).not.toBeInTheDocument();
  });

  it("includes a blank / none option in the Transfer select", () => {
    renderCreateModal();

    const options = transferSelect().querySelectorAll("option");
    const hasNone = Array.from(options).some(
      (o) => o.value === "" || /none|—|-/i.test(o.textContent ?? "")
    );
    expect(hasNone).toBe(true);
  });

  it("lists the other accounts as options in the Transfer select", () => {
    renderCreateModal();

    const options = Array.from(transferSelect().querySelectorAll("option")).map(
      (o) => o.textContent ?? ""
    );

    expect(options.some((o) => /dkb reserve/i.test(o))).toBe(true);
    expect(options.some((o) => /home loan/i.test(o))).toBe(true);
  });
});

describe("RecurringTransactionModal — Transfer Direction", () => {
  beforeEach(() => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => categories,
    } as Response);
  });

  it("shows no direction chips until a transfer account is selected", () => {
    renderCreateModal();

    expect(
      screen.queryByRole("button", { name: "To" })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "From" })
    ).not.toBeInTheDocument();
  });

  it("shows To / From chips once a transfer account is selected, defaulting to To", () => {
    renderCreateModal();

    fireEvent.change(transferSelect(), { target: { value: "acc-2" } });

    expect(screen.getByRole("button", { name: "To" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(screen.getByRole("button", { name: "From" })).toHaveAttribute(
      "aria-pressed",
      "false"
    );
  });

  it("hides the direction chips again when the transfer account is cleared", () => {
    renderCreateModal();

    fireEvent.change(transferSelect(), { target: { value: "acc-2" } });
    fireEvent.change(transferSelect(), { target: { value: "" } });

    expect(
      screen.queryByRole("button", { name: "To" })
    ).not.toBeInTheDocument();
  });

  it("To emits the viewed account as accountId and the chosen account as linkedAccountId", () => {
    const onSaved = vi.fn();
    renderCreateModal({ onSaved });

    fillTransfer("500", "acc-2");
    save();

    expect(onSaved).toHaveBeenCalledWith(
      expect.objectContaining({
        accountId: "acc-1",
        linkedAccountId: "acc-2",
        amount: 50000,
      })
    );
  });

  it("From emits the chosen account as accountId and the viewed account as linkedAccountId", () => {
    const onSaved = vi.fn();
    renderCreateModal({ onSaved });

    fillTransfer("500", "acc-2");
    fireEvent.click(screen.getByRole("button", { name: "From" }));
    save();

    expect(onSaved).toHaveBeenCalledWith(
      expect.objectContaining({
        accountId: "acc-2",
        linkedAccountId: "acc-1",
        amount: 50000,
      })
    );
  });

  it("a plain recurring row emits the viewed account as accountId", () => {
    const onSaved = vi.fn();
    renderCreateModal({ onSaved });

    fireEvent.change(screen.getByLabelText(/amount/i), {
      target: { value: "-1200" },
    });
    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: "Rent" },
    });
    save();

    expect(onSaved).toHaveBeenCalledWith(
      expect.objectContaining({ accountId: "acc-1", amount: -120000 })
    );
  });
});

describe("RecurringTransactionModal — Mortgage link warning removed", () => {
  beforeEach(() => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => categories,
    } as Response);
  });

  it("shows no ST-only warning when a Mortgage account is selected", () => {
    renderCreateModal();

    fireEvent.change(transferSelect(), { target: { value: "acc-3" } });

    expect(screen.queryByText(/ST-only model/i)).not.toBeInTheDocument();
    expect(
      screen.queryByText(/only Sondertilgung payments should link/i)
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("saves a positive transfer into a Mortgage account", () => {
    const onSaved = vi.fn();
    renderCreateModal({ onSaved });

    fillTransfer("1500", "acc-3");
    save();

    expect(onSaved).toHaveBeenCalledWith(
      expect.objectContaining({
        accountId: "acc-1",
        linkedAccountId: "acc-3",
        amount: 150000,
      })
    );
  });
});

describe("RecurringTransactionModal — transfer amount sign", () => {
  beforeEach(() => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => categories,
    } as Response);
  });

  it("shows the positive-amount message for a negative transfer amount", () => {
    const onSaved = vi.fn();
    renderCreateModal({ onSaved });

    fillTransfer("-500", "acc-2");
    save();

    expect(screen.getByRole("alert")).toHaveTextContent(TRANSFER_SIGN_MESSAGE);
    expect(onSaved).not.toHaveBeenCalled();
  });

  it("shows the positive-amount message for a zero transfer amount", () => {
    const onSaved = vi.fn();
    renderCreateModal({ onSaved });

    fillTransfer("0", "acc-2");
    save();

    expect(screen.getByRole("alert")).toHaveTextContent(TRANSFER_SIGN_MESSAGE);
    expect(onSaved).not.toHaveBeenCalled();
  });
});

const ownedTransfer: RecurringTransaction = {
  id: "rt-2",
  accountId: "acc-1",
  linkedAccountId: "acc-2",
  amount: 50000,
  description: "Savings transfer",
  category: "Transfer",
  frequency: "monthly",
  dayOfMonth: 1,
};

describe("RecurringTransactionModal — editing a transfer", () => {
  beforeEach(() => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => categories,
    } as Response);
  });

  it("seeds the absolute amount of a stored transfer", () => {
    renderEditModal({ transaction: { ...ownedTransfer, amount: -50000 } });

    const amountInput = screen.getByLabelText(/amount/i) as HTMLInputElement;
    expect(parseFloat(amountInput.value)).toBeCloseTo(500);
  });

  it("seeds the direction as To for a transfer owned by the viewed account", () => {
    renderEditModal({ transaction: ownedTransfer });

    expect(screen.getByRole("button", { name: "To" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
  });

  it("flipping to From saves once with the swapped accountId / linkedAccountId", () => {
    const onSaved = vi.fn();
    renderEditModal({ onSaved, transaction: ownedTransfer });

    fireEvent.click(screen.getByRole("button", { name: "From" }));
    save();

    expect(onSaved).toHaveBeenCalledTimes(1);
    expect(onSaved).toHaveBeenCalledWith(
      expect.objectContaining({
        accountId: "acc-2",
        linkedAccountId: "acc-1",
        amount: 50000,
      })
    );
  });
});

describe("RecurringTransactionModal — validation", () => {
  beforeEach(() => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => categories,
    } as Response);
  });

  it("shows an inline validation message when amount is missing", () => {
    renderCreateModal();

    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: "Rent" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save|add|create/i }));

    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("does not call onSaved when amount is missing", () => {
    const onSaved = vi.fn();
    renderCreateModal({ onSaved });

    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: "Rent" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save|add|create/i }));

    expect(onSaved).not.toHaveBeenCalled();
  });

  it("shows an inline validation message when description is missing", () => {
    renderCreateModal();

    fireEvent.change(screen.getByLabelText(/amount/i), {
      target: { value: "-1200" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save|add|create/i }));

    expect(screen.getByRole("alert")).toBeInTheDocument();
  });
});

describe("RecurringTransactionModal — successful save", () => {
  beforeEach(() => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => categories,
    } as Response);
  });

  it("calls onSaved with the correct RecurringFormPayload on valid create", () => {
    const onSaved = vi.fn();
    renderCreateModal({ onSaved });

    fireEvent.change(screen.getByLabelText(/amount/i), {
      target: { value: "-1200" },
    });
    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: "Rent" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save|add|create/i }));

    expect(onSaved).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: -120000,
        description: "Rent",
        frequency: "monthly",
        dayOfMonth: 1,
      })
    );
  });

  it("pre-selects the existing category by name and saves it unchanged when editing", async () => {
    const onSaved = vi.fn();
    renderEditModal({ onSaved });

    // The category resolves to the row's own value once the list has loaded.
    await screen.findByRole("option", { name: "Housing" });

    fireEvent.click(screen.getByRole("button", { name: /save|add|create/i }));

    expect(onSaved).toHaveBeenCalledWith(
      expect.objectContaining({ category: "Housing" })
    );
  });

  it("calls onClose after valid save", () => {
    const onClose = vi.fn();
    renderCreateModal({ onClose });

    fireEvent.change(screen.getByLabelText(/amount/i), {
      target: { value: "-1200" },
    });
    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: "Rent" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save|add|create/i }));

    expect(onClose).toHaveBeenCalled();
  });

  it("includes linkedAccountId in payload when a transfer account is selected", () => {
    const onSaved = vi.fn();
    renderCreateModal({ onSaved });

    fireEvent.change(screen.getByLabelText(/amount/i), {
      target: { value: "6500" },
    });
    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: "Sondertilgung" },
    });
    fireEvent.change(transferSelect(), {
      target: { value: "acc-3" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save|add|create/i }));

    expect(onSaved).toHaveBeenCalledWith(
      expect.objectContaining({ linkedAccountId: "acc-3" })
    );
  });

  it("does not include linkedAccountId in payload when none is selected", () => {
    const onSaved = vi.fn();
    renderCreateModal({ onSaved });

    fireEvent.change(screen.getByLabelText(/amount/i), {
      target: { value: "-1200" },
    });
    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: "Rent" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save|add|create/i }));

    const payload = onSaved.mock.calls[0][0] as Record<string, unknown>;
    expect(payload).not.toHaveProperty("linkedAccountId");
  });
});

describe("RecurringTransactionModal — edit mode pre-population", () => {
  beforeEach(() => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => categories,
    } as Response);
  });

  it("pre-populates the description field in edit mode", () => {
    renderEditModal();

    const descInput = screen.getByLabelText(/description/i) as HTMLInputElement;
    expect(descInput.value).toBe("Rent");
  });

  it("pre-populates the amount field in euros in edit mode", () => {
    renderEditModal();

    // -120000 cents = -1200.00 euros
    const amountInput = screen.getByLabelText(/amount/i) as HTMLInputElement;
    expect(parseFloat(amountInput.value)).toBeCloseTo(-1200);
  });
});

describe("RecurringTransactionModal — delete", () => {
  it("prompts for confirmation before deleting", () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => categories,
    } as Response);
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);

    renderEditModal();

    fireEvent.click(screen.getByRole("button", { name: /delete/i }));

    expect(confirmSpy).toHaveBeenCalled();
  });

  it("calls onDeleted after confirmed delete", () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => categories,
    } as Response);
    vi.spyOn(window, "confirm").mockReturnValue(true);

    const onDeleted = vi.fn();
    renderEditModal({ onDeleted });

    fireEvent.click(screen.getByRole("button", { name: /delete/i }));

    expect(onDeleted).toHaveBeenCalled();
  });

  it("does not call onDeleted when delete is not confirmed", () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => categories,
    } as Response);
    vi.spyOn(window, "confirm").mockReturnValue(false);

    const onDeleted = vi.fn();
    renderEditModal({ onDeleted });

    fireEvent.click(screen.getByRole("button", { name: /delete/i }));

    expect(onDeleted).not.toHaveBeenCalled();
  });
});

describe("RecurringTransactionModal — overlay", () => {
  it("calls onClose when the overlay backdrop is clicked", () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => categories,
    } as Response);
    const onClose = vi.fn();
    renderEditModal({ onClose });

    fireEvent.click(screen.getByTestId("modal-overlay"));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe("RecurringTransactionModal — dayOfMonth Stepper", () => {
  beforeEach(() => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => categories,
    } as Response);
  });

  it("renders Increment and Decrement buttons for the day-of-month field", () => {
    renderCreateModal();

    expect(
      screen.getByRole("button", { name: /increment/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /decrement/i })
    ).toBeInTheDocument();
  });

  it("clicking Increment once increases the submitted dayOfMonth to 2", () => {
    const onSaved = vi.fn();
    renderCreateModal({ onSaved });

    fireEvent.click(screen.getByRole("button", { name: /increment/i }));
    fireEvent.change(screen.getByLabelText(/amount/i), {
      target: { value: "-1200" },
    });
    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: "Rent" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save|add|create/i }));

    expect(onSaved).toHaveBeenCalledWith(
      expect.objectContaining({ dayOfMonth: 2 })
    );
  });

  it("clicking Decrement when dayOfMonth is 1 does not go below 1", () => {
    const onSaved = vi.fn();
    renderCreateModal({ onSaved });

    fireEvent.click(screen.getByRole("button", { name: /decrement/i }));
    fireEvent.change(screen.getByLabelText(/amount/i), {
      target: { value: "-1200" },
    });
    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: "Rent" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save|add|create/i }));

    expect(onSaved).toHaveBeenCalledWith(
      expect.objectContaining({ dayOfMonth: 1 })
    );
  });

  it("clicking Increment when dayOfMonth is 31 does not go above 31", () => {
    const onSaved = vi.fn();
    renderEditModal({
      onSaved,
      transaction: { ...existingRt, dayOfMonth: 31 },
    });

    fireEvent.click(screen.getByRole("button", { name: /increment/i }));
    fireEvent.click(screen.getByRole("button", { name: /save|add|create/i }));

    expect(onSaved).toHaveBeenCalledWith(
      expect.objectContaining({ dayOfMonth: 31 })
    );
  });
});

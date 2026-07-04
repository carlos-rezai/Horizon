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
  { id: "cat-1", name: "Housing", isDefault: true },
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

describe("RecurringTransactionModal — linked account field", () => {
  beforeEach(() => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => categories,
    } as Response);
  });

  it("renders the optional Transfer to account dropdown", () => {
    renderCreateModal();

    expect(screen.getByLabelText(/transfer to account/i)).toBeInTheDocument();
  });

  it("includes a blank / none option in the Transfer to account dropdown", () => {
    renderCreateModal();

    const options = screen
      .getByLabelText(/transfer to account/i)
      .querySelectorAll("option");
    const hasNone = Array.from(options).some(
      (o) => o.value === "" || /none|—|-/i.test(o.textContent ?? "")
    );
    expect(hasNone).toBe(true);
  });

  it("lists the other accounts as options in the Transfer to account dropdown", () => {
    renderCreateModal();

    const options = Array.from(
      screen.getByLabelText(/transfer to account/i).querySelectorAll("option")
    ).map((o) => o.textContent ?? "");

    expect(options.some((o) => /dkb reserve/i.test(o))).toBe(true);
    expect(options.some((o) => /home loan/i.test(o))).toBe(true);
  });
});

describe("RecurringTransactionModal — Mortgage link warning", () => {
  beforeEach(() => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => categories,
    } as Response);
  });

  it("does not show the Mortgage warning when no linked account is selected", () => {
    renderCreateModal();

    expect(screen.queryByText(/ST-only model/i)).not.toBeInTheDocument();
  });

  it("does not show the Mortgage warning when a non-Mortgage account is linked", () => {
    renderCreateModal();

    fireEvent.change(screen.getByLabelText(/transfer to account/i), {
      target: { value: "acc-2" },
    });

    expect(screen.queryByText(/ST-only model/i)).not.toBeInTheDocument();
  });

  it("shows the Mortgage warning when a Mortgage account is selected as the linked account", () => {
    renderCreateModal();

    fireEvent.change(screen.getByLabelText(/transfer to account/i), {
      target: { value: "acc-3" },
    });

    expect(screen.getByText(/ST-only model/i)).toBeInTheDocument();
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

  it("shows a validation error when a transfer amount is zero or negative", () => {
    renderCreateModal();

    fireEvent.change(screen.getByLabelText(/amount/i), {
      target: { value: "-6500" },
    });
    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: "Sondertilgung" },
    });
    fireEvent.change(screen.getByLabelText(/transfer to account/i), {
      target: { value: "acc-3" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save|add|create/i }));

    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("does not call onSaved when a transfer amount is zero or negative", () => {
    const onSaved = vi.fn();
    renderCreateModal({ onSaved });

    fireEvent.change(screen.getByLabelText(/amount/i), {
      target: { value: "-6500" },
    });
    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: "Sondertilgung" },
    });
    fireEvent.change(screen.getByLabelText(/transfer to account/i), {
      target: { value: "acc-3" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save|add|create/i }));

    expect(onSaved).not.toHaveBeenCalled();
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
    fireEvent.change(screen.getByLabelText(/transfer to account/i), {
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

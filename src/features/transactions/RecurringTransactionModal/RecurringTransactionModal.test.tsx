// @vitest-environment jsdom
import {
  render,
  screen,
  cleanup,
  fireEvent,
  waitFor,
} from "@testing-library/react";
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import RecurringTransactionModal from "./RecurringTransactionModal";
import type { RecurringTransaction } from "../../../types/recurring";
import type { AccountWithBalance } from "../../../types/account";
import type { Category } from "../../../types/category";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const categories: Category[] = [
  { _id: "cat-1", name: "Housing", isDefault: true },
];

const otherAccounts: AccountWithBalance[] = [
  {
    _id: "acc-2",
    kind: "Tagesgeld",
    name: "DKB Reserve",
    openingBalance: 200000,
    openingDate: "2026-01-01",
    balance: 220000,
  },
  {
    _id: "acc-3",
    kind: "Mortgage",
    name: "Home Loan",
    openingBalance: -30000000,
    openingDate: "2020-01-01",
    balance: -28000000,
  },
];

const existingRt: RecurringTransaction = {
  _id: "rt-1",
  accountId: "acc-1",
  amount: -120000,
  description: "Rent",
  category: "cat-1",
  frequency: "monthly",
  dayOfMonth: 1,
  isActive: true,
};

// Create mode — no transaction prop
const renderCreateModal = (
  overrides: Partial<{
    onClose: () => void;
    onSaved: (rt: RecurringTransaction) => void;
    onDeleted: (id: string) => void;
  }> = {}
) => {
  const props = {
    accountId: "acc-1",
    otherAccounts,
    onClose: vi.fn(),
    onSaved: vi.fn(),
    onDeleted: vi.fn(),
    ...overrides,
  };
  render(<RecurringTransactionModal {...props} />);
  return props;
};

// Edit mode — transaction prop provided
const renderEditModal = (
  overrides: Partial<{
    onClose: () => void;
    onSaved: (rt: RecurringTransaction) => void;
    onDeleted: (id: string) => void;
  }> = {}
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
  render(<RecurringTransactionModal {...props} />);
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

    expect(
      screen.getByLabelText(/transfer to account/i)
    ).toBeInTheDocument();
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

  it("does not call the API when amount is missing", () => {
    renderCreateModal();

    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: "Rent" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save|add|create/i }));

    const postCalls = vi
      .mocked(fetch)
      .mock.calls.filter(
        ([, init]) => (init as RequestInit)?.method === "POST"
      );
    expect(postCalls).toHaveLength(0);
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

describe("RecurringTransactionModal — successful create", () => {
  beforeEach(() => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce({
        ok: true,
        json: async () => categories,
      } as Response)
      .mockResolvedValue({
        ok: true,
        json: async () => existingRt,
      } as Response);
  });

  it("calls POST /recurring-transactions with the correct payload", async () => {
    renderCreateModal();

    fireEvent.change(screen.getByLabelText(/amount/i), {
      target: { value: "-1200" },
    });
    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: "Rent" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save|add|create/i }));

    await waitFor(() => {
      const postCall = vi.mocked(fetch).mock.calls.find(
        ([url, init]) =>
          typeof url === "string" &&
          url.includes("/recurring-transactions") &&
          (init as RequestInit)?.method === "POST"
      );
      expect(postCall).toBeDefined();

      const body = JSON.parse(
        (postCall![1] as RequestInit).body as string
      );
      expect(body.amount).toBe(-120000);
      expect(body.description).toBe("Rent");
      expect(body.accountId).toBe("acc-1");
    });
  });

  it("calls onSaved with the created entry after a successful create", async () => {
    const onSaved = vi.fn();
    renderCreateModal({ onSaved });

    fireEvent.change(screen.getByLabelText(/amount/i), {
      target: { value: "-1200" },
    });
    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: "Rent" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save|add|create/i }));

    await waitFor(() => {
      expect(onSaved).toHaveBeenCalledWith(
        expect.objectContaining({ _id: "rt-1" })
      );
    });
  });

  it("calls onClose after a successful create", async () => {
    const onClose = vi.fn();
    renderCreateModal({ onClose });

    fireEvent.change(screen.getByLabelText(/amount/i), {
      target: { value: "-1200" },
    });
    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: "Rent" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save|add|create/i }));

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
  });
});

describe("RecurringTransactionModal — server error on save", () => {
  beforeEach(() => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce({
        ok: true,
        json: async () => categories,
      } as Response)
      .mockResolvedValue({
        ok: false,
        json: async () => ({ error: "Save failed" }),
      } as Response);
  });

  it("shows an inline error when save fails", async () => {
    renderCreateModal();

    fireEvent.change(screen.getByLabelText(/amount/i), {
      target: { value: "-1200" },
    });
    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: "Rent" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save|add|create/i }));

    expect(await screen.findByText(/save failed/i)).toBeInTheDocument();
  });

  it("does not call onClose when save fails", async () => {
    const onClose = vi.fn();
    renderCreateModal({ onClose });

    fireEvent.change(screen.getByLabelText(/amount/i), {
      target: { value: "-1200" },
    });
    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: "Rent" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save|add|create/i }));

    await screen.findByText(/save failed/i);
    expect(onClose).not.toHaveBeenCalled();
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

  it("calls DELETE /recurring-transactions/:id after confirmed delete", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce({
        ok: true,
        json: async () => categories,
      } as Response)
      .mockResolvedValue({
        ok: true,
        json: async () => ({}),
      } as Response);

    renderEditModal();

    fireEvent.click(screen.getByRole("button", { name: /delete/i }));

    await waitFor(() => {
      const deleteCall = vi.mocked(fetch).mock.calls.find(
        ([url, init]) =>
          typeof url === "string" &&
          url.includes("/recurring-transactions/rt-1") &&
          (init as RequestInit)?.method === "DELETE"
      );
      expect(deleteCall).toBeDefined();
    });
  });

  it("calls onDeleted with the id after a successful delete", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce({
        ok: true,
        json: async () => categories,
      } as Response)
      .mockResolvedValue({
        ok: true,
        json: async () => ({}),
      } as Response);

    const onDeleted = vi.fn();
    renderEditModal({ onDeleted });

    fireEvent.click(screen.getByRole("button", { name: /delete/i }));

    await waitFor(() => {
      expect(onDeleted).toHaveBeenCalledWith("rt-1");
    });
  });

  it("shows an inline error when delete fails", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce({
        ok: true,
        json: async () => categories,
      } as Response)
      .mockResolvedValue({
        ok: false,
        json: async () => ({ error: "Delete failed" }),
      } as Response);

    renderEditModal();

    fireEvent.click(screen.getByRole("button", { name: /delete/i }));

    expect(await screen.findByText(/delete failed/i)).toBeInTheDocument();
  });
});

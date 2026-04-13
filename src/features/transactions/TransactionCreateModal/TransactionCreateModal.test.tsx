// @vitest-environment jsdom
import {
  render,
  screen,
  cleanup,
  fireEvent,
  waitFor,
} from "@testing-library/react";
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import TransactionCreateModal from "./TransactionCreateModal";
import type { Category } from "../../../types/category";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const categories: Category[] = [
  { _id: "cat-1", name: "Food", isDefault: true },
  { _id: "cat-2", name: "Income", isDefault: false },
];

const renderModal = (
  overrides: Partial<{
    onClose: () => void;
    onSuccess: () => void;
  }> = {}
) => {
  const props = {
    accountId: "acc-1",
    categories,
    onClose: vi.fn(),
    onSuccess: vi.fn(),
    ...overrides,
  };
  render(<TransactionCreateModal {...props} />);
  return props;
};

describe("TransactionCreateModal — validation", () => {
  beforeEach(() => {
    vi.spyOn(globalThis, "fetch");
  });

  it("does not call the API when date is missing", () => {
    renderModal();

    fireEvent.change(screen.getByLabelText(/amount/i), {
      target: { value: "50.00" },
    });
    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: "Groceries" },
    });
    fireEvent.click(screen.getByRole("button", { name: /add|save|submit/i }));

    expect(fetch).not.toHaveBeenCalled();
  });

  it("does not call the API when amount is missing", () => {
    renderModal();

    fireEvent.change(screen.getByLabelText(/date/i), {
      target: { value: "2026-03-01" },
    });
    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: "Groceries" },
    });
    fireEvent.click(screen.getByRole("button", { name: /add|save|submit/i }));

    expect(fetch).not.toHaveBeenCalled();
  });

  it("does not call the API when description is missing", () => {
    renderModal();

    fireEvent.change(screen.getByLabelText(/date/i), {
      target: { value: "2026-03-01" },
    });
    fireEvent.change(screen.getByLabelText(/amount/i), {
      target: { value: "50.00" },
    });
    fireEvent.click(screen.getByRole("button", { name: /add|save|submit/i }));

    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("TransactionCreateModal — successful submit", () => {
  beforeEach(() => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        _id: "txn-new",
        accountId: "acc-1",
        date: "2026-03-01",
        amount: -5000,
        description: "Groceries",
        category: "Food",
      }),
    } as Response);
  });

  it("calls onSuccess after a successful submission", async () => {
    const { onSuccess } = renderModal();

    fireEvent.change(screen.getByLabelText(/date/i), {
      target: { value: "2026-03-01" },
    });
    fireEvent.change(screen.getByLabelText(/amount/i), {
      target: { value: "-50.00" },
    });
    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: "Groceries" },
    });
    fireEvent.click(screen.getByRole("button", { name: /add|save|submit/i }));

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it("calls onClose after a successful submission", async () => {
    const { onClose } = renderModal();

    fireEvent.change(screen.getByLabelText(/date/i), {
      target: { value: "2026-03-01" },
    });
    fireEvent.change(screen.getByLabelText(/amount/i), {
      target: { value: "-50.00" },
    });
    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: "Groceries" },
    });
    fireEvent.click(screen.getByRole("button", { name: /add|save|submit/i }));

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
  });

  it("sends the amount as integer cents, not the raw euro string", async () => {
    renderModal();

    fireEvent.change(screen.getByLabelText(/date/i), {
      target: { value: "2026-03-01" },
    });
    fireEvent.change(screen.getByLabelText(/amount/i), {
      target: { value: "-50.00" },
    });
    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: "Groceries" },
    });
    fireEvent.click(screen.getByRole("button", { name: /add|save|submit/i }));

    await waitFor(() => expect(fetch).toHaveBeenCalled());

    const [, init] = vi.mocked(fetch).mock.calls[0];
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.amount).toBe(-5000);
  });
});

describe("TransactionCreateModal — server error", () => {
  beforeEach(() => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Transaction creation failed" }),
    } as Response);
  });

  it("shows the server error message inline", async () => {
    renderModal();

    fireEvent.change(screen.getByLabelText(/date/i), {
      target: { value: "2026-03-01" },
    });
    fireEvent.change(screen.getByLabelText(/amount/i), {
      target: { value: "-50.00" },
    });
    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: "Groceries" },
    });
    fireEvent.click(screen.getByRole("button", { name: /add|save|submit/i }));

    expect(
      await screen.findByText(/transaction creation failed/i)
    ).toBeInTheDocument();
  });

  it("does not call onClose when the server returns an error", async () => {
    const { onClose } = renderModal();

    fireEvent.change(screen.getByLabelText(/date/i), {
      target: { value: "2026-03-01" },
    });
    fireEvent.change(screen.getByLabelText(/amount/i), {
      target: { value: "-50.00" },
    });
    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: "Groceries" },
    });
    fireEvent.click(screen.getByRole("button", { name: /add|save|submit/i }));

    await screen.findByText(/transaction creation failed/i);
    expect(onClose).not.toHaveBeenCalled();
  });
});

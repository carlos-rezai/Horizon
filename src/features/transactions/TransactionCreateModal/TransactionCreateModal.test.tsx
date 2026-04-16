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
    onClose: vi.fn(),
    onSuccess: vi.fn(),
    ...overrides,
  };
  render(
    <ThemeProvider theme={theme}>
      <TransactionCreateModal {...props} />
    </ThemeProvider>
  );
  return props;
};

describe("TransactionCreateModal — validation", () => {
  beforeEach(() => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => categories,
    } as Response);
  });

  it("does not call POST /transactions when date is missing", () => {
    renderModal();

    fireEvent.change(screen.getByLabelText(/amount/i), {
      target: { value: "50.00" },
    });
    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: "Groceries" },
    });
    fireEvent.click(screen.getByRole("button", { name: /add|save|submit/i }));

    const postCalls = vi
      .mocked(fetch)
      .mock.calls.filter(
        ([, init]) => (init as RequestInit)?.method === "POST"
      );
    expect(postCalls).toHaveLength(0);
  });

  it("does not call POST /transactions when amount is missing", () => {
    renderModal();

    fireEvent.change(screen.getByLabelText(/date/i), {
      target: { value: "2026-03-01" },
    });
    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: "Groceries" },
    });
    fireEvent.click(screen.getByRole("button", { name: /add|save|submit/i }));

    const postCalls = vi
      .mocked(fetch)
      .mock.calls.filter(
        ([, init]) => (init as RequestInit)?.method === "POST"
      );
    expect(postCalls).toHaveLength(0);
  });

  it("does not call POST /transactions when description is missing", () => {
    renderModal();

    fireEvent.change(screen.getByLabelText(/date/i), {
      target: { value: "2026-03-01" },
    });
    fireEvent.change(screen.getByLabelText(/amount/i), {
      target: { value: "50.00" },
    });
    fireEvent.click(screen.getByRole("button", { name: /add|save|submit/i }));

    const postCalls = vi
      .mocked(fetch)
      .mock.calls.filter(
        ([, init]) => (init as RequestInit)?.method === "POST"
      );
    expect(postCalls).toHaveLength(0);
  });
});

describe("TransactionCreateModal — successful submit", () => {
  beforeEach(() => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce({
        ok: true,
        json: async () => categories,
      } as Response)
      .mockResolvedValue({
        ok: true,
        json: async () => ({
          _id: "txn-new",
          accountId: "acc-1",
          date: "2026-03-01",
          amount: -5000,
          description: "Groceries",
          category: "cat-1",
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

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));

    // mock.calls[0] = GET /categories, mock.calls[1] = POST /transactions
    const [, init] = vi.mocked(fetch).mock.calls[1];
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.amount).toBe(-5000);
  });
});

describe("TransactionCreateModal — server error", () => {
  beforeEach(() => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce({
        ok: true,
        json: async () => categories,
      } as Response)
      .mockResolvedValue({
        ok: false,
        json: async () => ({ error: "Transaction creation failed" }),
      } as Response);
  });

  it("shows a server error inline and does not call onClose when the API returns an error", async () => {
    const onClose = vi.fn();
    renderModal({ onClose });

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
    expect(onClose).not.toHaveBeenCalled();
  });

  it("calls onClose when the cancel button is clicked without submitting", async () => {
    const onClose = vi.fn();
    renderModal({ onClose });

    fireEvent.click(screen.getByRole("button", { name: /cancel|close/i }));

    expect(onClose).toHaveBeenCalled();
  });
});

describe("TransactionCreateModal — overlay", () => {
  it("calls onClose when the overlay backdrop is clicked", () => {
    const onClose = vi.fn();
    renderModal({ onClose });

    fireEvent.click(screen.getByTestId("modal-overlay"));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

// @vitest-environment jsdom
import {
  render,
  screen,
  cleanup,
  fireEvent,
  waitFor,
} from "@testing-library/react";
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import TransferCreateModal from "./TransferCreateModal";
import type { AccountWithBalance } from "../../../types/account";
import type { Category } from "../../../types/category";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const categories: Category[] = [
  { _id: "cat-1", name: "Food", isDefault: true },
  { _id: "cat-2", name: "Income", isDefault: false },
];

const accounts: AccountWithBalance[] = [
  {
    _id: "acc-1",
    kind: "Girokonto",
    name: "Main Checking",
    openingBalance: 100000,
    openingDate: "2026-01-01",
    balance: 150000,
  },
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

const renderModal = (
  overrides: Partial<{
    fromAccountId: string;
    accounts: AccountWithBalance[];
    onClose: () => void;
    onSuccess: () => void;
  }> = {}
) => {
  const props = {
    fromAccountId: "acc-1",
    accounts,
    onClose: vi.fn(),
    onSuccess: vi.fn(),
    ...overrides,
  };
  render(<TransferCreateModal {...props} />);
  return props;
};

describe("TransferCreateModal — destination selector", () => {
  beforeEach(() => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => categories,
    } as Response);
  });

  it("does not include the from account in the destination options", () => {
    renderModal();

    const options = screen
      .getAllByRole("option")
      .map((o) => o.textContent ?? "");

    expect(options.some((o) => /main checking/i.test(o))).toBe(false);
  });

  it("includes all other accounts as destination options", () => {
    renderModal();

    const options = screen
      .getAllByRole("option")
      .map((o) => o.textContent ?? "");

    expect(options.some((o) => /dkb reserve/i.test(o))).toBe(true);
    expect(options.some((o) => /home loan/i.test(o))).toBe(true);
  });
});

describe("TransferCreateModal — validation", () => {
  beforeEach(() => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => categories,
    } as Response);
  });

  it("shows an inline validation message when date is missing", () => {
    renderModal();

    fireEvent.change(screen.getByLabelText(/amount/i), {
      target: { value: "100.00" },
    });
    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: "Transfer" },
    });
    fireEvent.click(screen.getByRole("button", { name: /submit|send|transfer/i }));

    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("does not call POST /transfers when date is missing", () => {
    renderModal();

    fireEvent.change(screen.getByLabelText(/amount/i), {
      target: { value: "100.00" },
    });
    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: "Transfer" },
    });
    fireEvent.click(screen.getByRole("button", { name: /submit|send|transfer/i }));

    const postCalls = vi
      .mocked(fetch)
      .mock.calls.filter(
        ([, init]) => (init as RequestInit)?.method === "POST"
      );
    expect(postCalls).toHaveLength(0);
  });

  it("shows an inline validation message when amount is missing", () => {
    renderModal();

    fireEvent.change(screen.getByLabelText(/date/i), {
      target: { value: "2026-03-01" },
    });
    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: "Transfer" },
    });
    fireEvent.click(screen.getByRole("button", { name: /submit|send|transfer/i }));

    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("does not call POST /transfers when amount is missing", () => {
    renderModal();

    fireEvent.change(screen.getByLabelText(/date/i), {
      target: { value: "2026-03-01" },
    });
    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: "Transfer" },
    });
    fireEvent.click(screen.getByRole("button", { name: /submit|send|transfer/i }));

    const postCalls = vi
      .mocked(fetch)
      .mock.calls.filter(
        ([, init]) => (init as RequestInit)?.method === "POST"
      );
    expect(postCalls).toHaveLength(0);
  });
});

describe("TransferCreateModal — successful submit", () => {
  beforeEach(() => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce({
        ok: true,
        json: async () => categories,
      } as Response)
      .mockResolvedValue({
        ok: true,
        json: async () => ({
          fromTransaction: {
            _id: "txn-1",
            accountId: "acc-1",
            date: "2026-03-01",
            amount: -10000,
            description: "Transfer to DKB",
            category: "cat-1",
            transferId: "transfer-xyz",
          },
          toTransaction: {
            _id: "txn-2",
            accountId: "acc-2",
            date: "2026-03-01",
            amount: 10000,
            description: "Transfer to DKB",
            category: "cat-1",
            transferId: "transfer-xyz",
          },
        }),
      } as Response);
  });

  it("calls POST /transfers with the correct payload", async () => {
    renderModal();

    fireEvent.change(screen.getByLabelText(/date/i), {
      target: { value: "2026-03-01" },
    });
    fireEvent.change(screen.getByLabelText(/amount/i), {
      target: { value: "100.00" },
    });
    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: "Transfer to DKB" },
    });
    fireEvent.click(screen.getByRole("button", { name: /submit|send|transfer/i }));

    await waitFor(() => {
      const postCall = vi.mocked(fetch).mock.calls.find(
        ([url, init]) =>
          typeof url === "string" &&
          url.includes("/transfers") &&
          (init as RequestInit)?.method === "POST"
      );
      expect(postCall).toBeDefined();

      const body = JSON.parse(
        (postCall![1] as RequestInit).body as string
      );
      expect(body.fromAccountId).toBe("acc-1");
      expect(body.toAccountId).toBeDefined();
      expect(body.amount).toBe(10000);
      expect(body.date).toBe("2026-03-01");
      expect(body.description).toBe("Transfer to DKB");
    });
  });

  it("calls onSuccess after a successful submission", async () => {
    const onSuccess = vi.fn();
    renderModal({ onSuccess });

    fireEvent.change(screen.getByLabelText(/date/i), {
      target: { value: "2026-03-01" },
    });
    fireEvent.change(screen.getByLabelText(/amount/i), {
      target: { value: "100.00" },
    });
    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: "Transfer to DKB" },
    });
    fireEvent.click(screen.getByRole("button", { name: /submit|send|transfer/i }));

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it("calls onClose after a successful submission", async () => {
    const onClose = vi.fn();
    renderModal({ onClose });

    fireEvent.change(screen.getByLabelText(/date/i), {
      target: { value: "2026-03-01" },
    });
    fireEvent.change(screen.getByLabelText(/amount/i), {
      target: { value: "100.00" },
    });
    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: "Transfer to DKB" },
    });
    fireEvent.click(screen.getByRole("button", { name: /submit|send|transfer/i }));

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
  });
});

describe("TransferCreateModal — server error", () => {
  beforeEach(() => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce({
        ok: true,
        json: async () => categories,
      } as Response)
      .mockResolvedValue({
        ok: false,
        json: async () => ({ error: "Transfer creation failed" }),
      } as Response);
  });

  it("shows a server error inline when the API returns an error", async () => {
    renderModal();

    fireEvent.change(screen.getByLabelText(/date/i), {
      target: { value: "2026-03-01" },
    });
    fireEvent.change(screen.getByLabelText(/amount/i), {
      target: { value: "100.00" },
    });
    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: "Transfer to DKB" },
    });
    fireEvent.click(screen.getByRole("button", { name: /submit|send|transfer/i }));

    expect(
      await screen.findByText(/transfer creation failed/i)
    ).toBeInTheDocument();
  });

  it("does not call onClose when the server returns an error", async () => {
    const onClose = vi.fn();
    renderModal({ onClose });

    fireEvent.change(screen.getByLabelText(/date/i), {
      target: { value: "2026-03-01" },
    });
    fireEvent.change(screen.getByLabelText(/amount/i), {
      target: { value: "100.00" },
    });
    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: "Transfer to DKB" },
    });
    fireEvent.click(screen.getByRole("button", { name: /submit|send|transfer/i }));

    await screen.findByText(/transfer creation failed/i);
    expect(onClose).not.toHaveBeenCalled();
  });
});

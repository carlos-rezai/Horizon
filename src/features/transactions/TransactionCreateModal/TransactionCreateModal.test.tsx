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
import type { AccountWithBalance } from "../../../types/account";

vi.mock("../../../primitives/DatePicker/DatePicker", () => ({
  default: ({
    value,
    onChange,
    minDate,
    maxDate,
    "aria-label": ariaLabel,
  }: {
    value?: string;
    onChange?: (v: string) => void;
    minDate?: string;
    maxDate?: string;
    "aria-label"?: string;
  }) => (
    <input
      type="text"
      aria-label={ariaLabel}
      data-testid="datepicker"
      data-min={minDate}
      data-max={maxDate}
      value={value ?? ""}
      onChange={(e) => onChange?.(e.target.value)}
    />
  ),
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const categories: Category[] = [
  { id: "cat-1", name: "Food", isDefault: true },
  { id: "cat-2", name: "Income", isDefault: false },
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
          id: "txn-new",
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

// ---------------------------------------------------------------------------
// Fixtures for destination account picker tests
// ---------------------------------------------------------------------------

const pickerAccounts: AccountWithBalance[] = [
  {
    id: "acc-1",
    kind: "Girokonto",
    name: "Main Checking",
    openingBalance: 100000,
    openingDate: "2026-01-01",
    balance: 150000,
  },
  {
    id: "acc-2",
    kind: "Tagesgeld",
    name: "DKB Reserve",
    openingBalance: 200000,
    openingDate: "2026-01-01",
    balance: 220000,
  },
];

const renderModalWithAccounts = (
  overrides: Partial<{
    accountId: string;
    accounts: AccountWithBalance[];
    month: string;
    onClose: () => void;
    onSuccess: () => void;
  }> = {}
) => {
  const props = {
    accountId: "acc-1",
    accounts: pickerAccounts,
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

describe("TransactionCreateModal — destination account picker", () => {
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
            id: "txn-1",
            accountId: "acc-1",
            date: "2026-05-10",
            amount: -10000,
            description: "Savings",
            transferId: "tf-1",
          },
          toTransaction: {
            id: "txn-2",
            accountId: "acc-2",
            date: "2026-05-10",
            amount: 10000,
            description: "Savings",
            transferId: "tf-1",
          },
        }),
      } as Response);
  });

  it("shows a destination account selector when accounts prop is provided", () => {
    renderModalWithAccounts();

    expect(
      screen.getByLabelText(/to account|destination/i)
    ).toBeInTheDocument();
  });

  it("excludes the source accountId from the destination selector options", () => {
    renderModalWithAccounts();

    const options = screen
      .getAllByRole("option")
      .map((o) => o.textContent ?? "");

    expect(options.some((o) => /main checking/i.test(o))).toBe(false);
    expect(options.some((o) => /dkb reserve/i.test(o))).toBe(true);
  });

  it("calls POST /accounts/:id/transactions when no destination is selected", async () => {
    renderModalWithAccounts();

    fireEvent.change(screen.getByLabelText(/date/i), {
      target: { value: "2026-05-10" },
    });
    fireEvent.change(screen.getByLabelText(/amount/i), {
      target: { value: "-50.00" },
    });
    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: "Groceries" },
    });
    fireEvent.click(screen.getByRole("button", { name: /add|save|submit/i }));

    await waitFor(() => {
      const postCall = vi
        .mocked(fetch)
        .mock.calls.find(
          ([url, init]) =>
            typeof url === "string" &&
            url.includes("/accounts/acc-1/transactions") &&
            (init as RequestInit)?.method === "POST"
        );
      expect(postCall).toBeDefined();
    });
  });

  it("calls POST /transfers when a destination account is selected", async () => {
    renderModalWithAccounts();

    fireEvent.change(screen.getByLabelText(/date/i), {
      target: { value: "2026-05-10" },
    });
    fireEvent.change(screen.getByLabelText(/amount/i), {
      target: { value: "100.00" },
    });
    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: "Savings" },
    });
    fireEvent.change(screen.getByLabelText(/to account|destination/i), {
      target: { value: "acc-2" },
    });
    fireEvent.click(screen.getByRole("button", { name: /add|save|submit/i }));

    await waitFor(() => {
      const postCall = vi
        .mocked(fetch)
        .mock.calls.find(
          ([url, init]) =>
            typeof url === "string" &&
            url.includes("/transfers") &&
            (init as RequestInit)?.method === "POST"
        );
      expect(postCall).toBeDefined();
    });
  });
});

describe("TransactionCreateModal — month prop", () => {
  beforeEach(() => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => categories,
    } as Response);
  });

  it("constrains the DatePicker to the first and last day of the given month", () => {
    render(
      <ThemeProvider theme={theme}>
        <TransactionCreateModal
          accountId="acc-1"
          month="2026-05"
          onClose={vi.fn()}
          onSuccess={vi.fn()}
        />
      </ThemeProvider>
    );

    const datepicker = screen.getByTestId("datepicker");
    expect(datepicker).toHaveAttribute("data-min", "2026-05-01");
    expect(datepicker).toHaveAttribute("data-max", "2026-05-31");
  });
});

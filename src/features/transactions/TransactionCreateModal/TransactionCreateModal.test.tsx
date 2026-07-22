// @vitest-environment jsdom
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { ThemeProvider } from "styled-components";
import { theme } from "../../../tokens";
import TransactionCreateModal from "./TransactionCreateModal";
import type { Category } from "../../../types/category";
import type { AccountWithBalance } from "../../../types/account";
import type { TransactionDraft } from "../../../types/transaction";

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
  {
    id: "cat-1",
    name: "Food",
    isDefault: true,
    color: "#74C29B",
    hidden: false,
  },
  {
    id: "cat-2",
    name: "Income",
    isDefault: false,
    color: "#7FA7D9",
    hidden: false,
  },
];

/** The modal only reads categories; nothing it does writes to the server. */
beforeEach(() => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue({
    ok: true,
    json: async () => categories,
  } as Response);
});

const renderModal = (
  overrides: Partial<{
    onClose: () => void;
    onSubmit: (draft: TransactionDraft) => void;
  }> = {}
) => {
  const props = {
    accountId: "acc-1",
    onClose: vi.fn(),
    onSubmit: vi.fn(),
    ...overrides,
  };
  render(
    <ThemeProvider theme={theme}>
      <TransactionCreateModal {...props} />
    </ThemeProvider>
  );
  return props;
};

const submit = () =>
  fireEvent.click(screen.getByRole("button", { name: /add|save|submit/i }));

function fillIn({
  date,
  amount,
  description,
}: {
  date?: string;
  amount?: string;
  description?: string;
}) {
  if (date !== undefined) {
    fireEvent.change(screen.getByLabelText(/date/i), {
      target: { value: date },
    });
  }
  if (amount !== undefined) {
    fireEvent.change(screen.getByLabelText(/amount/i), {
      target: { value: amount },
    });
  }
  if (description !== undefined) {
    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: description },
    });
  }
}

describe("TransactionCreateModal — validation", () => {
  it("does not submit a draft when date is missing", () => {
    const { onSubmit } = renderModal();

    fillIn({ amount: "50.00", description: "Groceries" });
    submit();

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("does not submit a draft when amount is missing", () => {
    const { onSubmit } = renderModal();

    fillIn({ date: "2026-03-01", description: "Groceries" });
    submit();

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("does not submit a draft when description is missing", () => {
    const { onSubmit } = renderModal();

    fillIn({ date: "2026-03-01", amount: "50.00" });
    submit();

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("never writes to the server itself", () => {
    renderModal();

    fillIn({ date: "2026-03-01", amount: "-50.00", description: "Groceries" });
    submit();

    const writes = vi
      .mocked(fetch)
      .mock.calls.filter(
        ([, init]) => (init as RequestInit)?.method === "POST"
      );
    expect(writes).toHaveLength(0);
  });
});

describe("TransactionCreateModal — submit", () => {
  it("hands the typed draft to onSubmit", () => {
    const { onSubmit } = renderModal();

    fillIn({ date: "2026-03-01", amount: "-50.00", description: "Groceries" });
    submit();

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        date: "2026-03-01",
        description: "Groceries",
      })
    );
  });

  it("hands over the amount as integer cents, not the raw euro string", () => {
    const { onSubmit } = renderModal();

    fillIn({ date: "2026-03-01", amount: "-50.00", description: "Groceries" });
    submit();

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ amount: -5000 })
    );
  });

  it("calls onClose when the cancel button is clicked without submitting", () => {
    const { onClose, onSubmit } = renderModal();

    fireEvent.click(screen.getByRole("button", { name: /cancel|close/i }));

    expect(onClose).toHaveBeenCalled();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

describe("TransactionCreateModal — overlay", () => {
  it("calls onClose when the overlay backdrop is clicked", () => {
    const { onClose } = renderModal();

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
    onSubmit: (draft: TransactionDraft) => void;
  }> = {}
) => {
  const props = {
    accountId: "acc-1",
    accounts: pickerAccounts,
    onClose: vi.fn(),
    onSubmit: vi.fn(),
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

  it("leaves toAccountId out of the draft when no destination is selected", () => {
    const { onSubmit } = renderModalWithAccounts();

    fillIn({ date: "2026-05-10", amount: "-50.00", description: "Groceries" });
    submit();

    const [draft] = vi.mocked(onSubmit).mock.calls[0];
    expect(draft.toAccountId).toBeUndefined();
  });

  it("carries the destination account in the draft when one is selected", () => {
    const { onSubmit } = renderModalWithAccounts();

    fillIn({ date: "2026-05-10", amount: "100.00", description: "Savings" });
    fireEvent.change(screen.getByLabelText(/to account|destination/i), {
      target: { value: "acc-2" },
    });
    submit();

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ toAccountId: "acc-2" })
    );
  });
});

describe("TransactionCreateModal — month prop", () => {
  it("constrains the DatePicker to the first and last day of the given month", () => {
    render(
      <ThemeProvider theme={theme}>
        <TransactionCreateModal
          accountId="acc-1"
          month="2026-05"
          onClose={vi.fn()}
          onSubmit={vi.fn()}
        />
      </ThemeProvider>
    );

    const datepicker = screen.getByTestId("datepicker");
    expect(datepicker).toHaveAttribute("data-min", "2026-05-01");
    expect(datepicker).toHaveAttribute("data-max", "2026-05-31");
  });
});

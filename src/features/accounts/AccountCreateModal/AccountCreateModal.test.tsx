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
import { theme, accountIconSet } from "../../../tokens";
import type { AccountWithBalance } from "../../../types/account";
import AccountCreateModal from "./AccountCreateModal";

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

beforeEach(() => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue({
    ok: true,
    json: async () => ({
      id: "new-account-id",
      kind: "Girokonto",
      name: "Main",
      anchorBalance: 0,
      anchorDate: "2026-01-01",
      balance: 0,
    }),
  } as Response);
});

describe("AccountCreateModal — Sondertilgung Allowance field visibility", () => {
  it("does not show the Sondertilgung Allowance field for the default account kind", () => {
    renderWithTheme(
      <AccountCreateModal onClose={vi.fn()} onSuccess={vi.fn()} />
    );

    expect(
      screen.queryByLabelText(/sondertilgung allowance/i)
    ).not.toBeInTheDocument();
  });

  it("shows the Sondertilgung Allowance field when kind is changed to Mortgage", () => {
    renderWithTheme(
      <AccountCreateModal onClose={vi.fn()} onSuccess={vi.fn()} />
    );

    fireEvent.change(screen.getByLabelText(/kind/i), {
      target: { value: "Mortgage" },
    });

    expect(
      screen.getByLabelText(/sondertilgung allowance/i)
    ).toBeInTheDocument();
  });

  it("hides the Sondertilgung Allowance field when kind is changed away from Mortgage", () => {
    renderWithTheme(
      <AccountCreateModal onClose={vi.fn()} onSuccess={vi.fn()} />
    );

    fireEvent.change(screen.getByLabelText(/kind/i), {
      target: { value: "Mortgage" },
    });
    fireEvent.change(screen.getByLabelText(/kind/i), {
      target: { value: "Tagesgeld" },
    });

    expect(
      screen.queryByLabelText(/sondertilgung allowance/i)
    ).not.toBeInTheDocument();
  });
});

describe("AccountCreateModal — validation", () => {
  it("does not call the API when name is empty", () => {
    renderWithTheme(
      <AccountCreateModal onClose={vi.fn()} onSuccess={vi.fn()} />
    );

    fireEvent.change(screen.getByLabelText(/as of/i), {
      target: { value: "2026-01-01" },
    });
    fireEvent.click(screen.getByRole("button", { name: /create|add|save/i }));

    expect(fetch).not.toHaveBeenCalled();
  });

  it("does not call the API when the as-of date is empty", () => {
    renderWithTheme(
      <AccountCreateModal onClose={vi.fn()} onSuccess={vi.fn()} />
    );

    fireEvent.change(screen.getByLabelText(/name/i), {
      target: { value: "My Account" },
    });
    fireEvent.click(screen.getByRole("button", { name: /create|add|save/i }));

    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("AccountCreateModal — submission", () => {
  it("calls onSuccess with the new account id after a successful submission", async () => {
    const onSuccess = vi.fn();
    renderWithTheme(
      <AccountCreateModal onClose={vi.fn()} onSuccess={onSuccess} />
    );

    fireEvent.change(screen.getByLabelText(/name/i), {
      target: { value: "Main Girokonto" },
    });
    fireEvent.change(screen.getByLabelText(/^balance$/i), {
      target: { value: "1000.00" },
    });
    fireEvent.change(screen.getByLabelText(/as of/i), {
      target: { value: "2026-01-01" },
    });
    fireEvent.click(screen.getByRole("button", { name: /create|add|save/i }));

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith("new-account-id");
    });
  });

  it("shows a server error inline and does not call onClose when the API returns an error", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Account creation failed" }),
    } as Response);

    const onClose = vi.fn();
    renderWithTheme(
      <AccountCreateModal onClose={onClose} onSuccess={vi.fn()} />
    );

    fireEvent.change(screen.getByLabelText(/name/i), {
      target: { value: "Main Girokonto" },
    });
    fireEvent.change(screen.getByLabelText(/as of/i), {
      target: { value: "2026-01-01" },
    });
    fireEvent.click(screen.getByRole("button", { name: /create|add|save/i }));

    expect(
      await screen.findByText(/account creation failed/i)
    ).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("calls onClose when the cancel button is clicked without submitting", () => {
    const onClose = vi.fn();
    renderWithTheme(
      <AccountCreateModal onClose={onClose} onSuccess={vi.fn()} />
    );

    fireEvent.click(screen.getByRole("button", { name: /cancel|close/i }));

    expect(onClose).toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("AccountCreateModal — overlay", () => {
  it("calls onClose when the overlay backdrop is clicked", () => {
    const onClose = vi.fn();
    renderWithTheme(
      <AccountCreateModal onClose={onClose} onSuccess={vi.fn()} />
    );

    fireEvent.click(screen.getByTestId("modal-overlay"));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe("AccountCreateModal — icon picker", () => {
  it("renders one button per icon in the set", () => {
    renderWithTheme(
      <AccountCreateModal onClose={vi.fn()} onSuccess={vi.fn()} />
    );

    accountIconSet.forEach((name) => {
      expect(screen.getByRole("button", { name })).toBeInTheDocument();
    });
  });

  it("submits the clicked icon name in the request body", async () => {
    renderWithTheme(
      <AccountCreateModal onClose={vi.fn()} onSuccess={vi.fn()} />
    );

    fireEvent.click(screen.getByRole("button", { name: "Wallet" }));
    fireEvent.change(screen.getByLabelText(/name/i), {
      target: { value: "Main" },
    });
    fireEvent.change(screen.getByLabelText(/as of/i), {
      target: { value: "2026-01-01" },
    });
    fireEvent.click(screen.getByRole("button", { name: /create|add|save/i }));

    await waitFor(() => {
      const calls = vi.mocked(globalThis.fetch).mock.calls;
      const body = JSON.parse(
        (calls[calls.length - 1][1] as RequestInit).body as string
      );
      expect(body.icon).toBe("Wallet");
    });
  });

  it("submits null for icon when no icon is selected", async () => {
    renderWithTheme(
      <AccountCreateModal onClose={vi.fn()} onSuccess={vi.fn()} />
    );

    fireEvent.change(screen.getByLabelText(/name/i), {
      target: { value: "Main" },
    });
    fireEvent.change(screen.getByLabelText(/as of/i), {
      target: { value: "2026-01-01" },
    });
    fireEvent.click(screen.getByRole("button", { name: /create|add|save/i }));

    await waitFor(() => {
      const calls = vi.mocked(globalThis.fetch).mock.calls;
      const body = JSON.parse(
        (calls[calls.length - 1][1] as RequestInit).body as string
      );
      expect(body.icon).toBeNull();
    });
  });
});

describe("AccountCreateModal — color picker", () => {
  it("renders one swatch button per color in the palette", () => {
    renderWithTheme(
      <AccountCreateModal onClose={vi.fn()} onSuccess={vi.fn()} />
    );

    theme.colors.accountColorPalette.forEach((color) => {
      expect(screen.getByRole("button", { name: color })).toBeInTheDocument();
    });
  });

  it("pre-fills a palette color on mount so submit body always has a color", async () => {
    renderWithTheme(
      <AccountCreateModal onClose={vi.fn()} onSuccess={vi.fn()} />
    );

    fireEvent.change(screen.getByLabelText(/name/i), {
      target: { value: "Main" },
    });
    fireEvent.change(screen.getByLabelText(/as of/i), {
      target: { value: "2026-01-01" },
    });
    fireEvent.click(screen.getByRole("button", { name: /create|add|save/i }));

    await waitFor(() => {
      const calls = vi.mocked(globalThis.fetch).mock.calls;
      const body = JSON.parse(
        (calls[calls.length - 1][1] as RequestInit).body as string
      );
      expect(theme.colors.accountColorPalette).toContain(body.color);
    });
  });

  it("submits the clicked swatch color in the request body", async () => {
    const targetColor = theme.colors.accountColorPalette[2];
    renderWithTheme(
      <AccountCreateModal onClose={vi.fn()} onSuccess={vi.fn()} />
    );

    fireEvent.click(screen.getByRole("button", { name: targetColor }));
    fireEvent.change(screen.getByLabelText(/name/i), {
      target: { value: "Main" },
    });
    fireEvent.change(screen.getByLabelText(/as of/i), {
      target: { value: "2026-01-01" },
    });
    fireEvent.click(screen.getByRole("button", { name: /create|add|save/i }));

    await waitFor(() => {
      const calls = vi.mocked(globalThis.fetch).mock.calls;
      const body = JSON.parse(
        (calls[calls.length - 1][1] as RequestInit).body as string
      );
      expect(body.color).toBe(targetColor);
    });
  });
});

describe("AccountCreateModal — edit mode", () => {
  const mockAccount: AccountWithBalance = {
    id: "acc-1",
    kind: "Girokonto",
    name: "Main Account",
    anchorBalance: 100000,
    anchorDate: "2024-03-15",
    balance: 120000,
  };

  it("pre-populates name, balance, as-of date, and kind from the account prop", () => {
    renderWithTheme(
      <AccountCreateModal
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        account={mockAccount}
      />
    );

    expect(screen.getByLabelText(/name/i)).toHaveValue("Main Account");
    expect(screen.getByLabelText(/^balance$/i)).toHaveValue(1000);
    expect(screen.getByLabelText(/as of/i)).toHaveValue("15.03.2024");
    expect(screen.getByLabelText(/kind/i)).toHaveValue("Girokonto");
  });

  it("shows sondertilgung allowance pre-populated for a Mortgage account in edit mode", () => {
    const mortgageAccount: AccountWithBalance = {
      ...mockAccount,
      kind: "Mortgage",
      sondertilgungAllowance: 500000,
    };

    renderWithTheme(
      <AccountCreateModal
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        account={mortgageAccount}
      />
    );

    expect(screen.getByLabelText(/sondertilgung allowance/i)).toHaveValue(5000);
  });

  it("shows 'Edit account' title and 'Save changes' submit button in edit mode", () => {
    renderWithTheme(
      <AccountCreateModal
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        account={mockAccount}
      />
    );

    expect(screen.getByText(/edit account/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /save changes/i })
    ).toBeInTheDocument();
  });

  it("issues PATCH to /accounts/:id instead of POST on submit in edit mode", async () => {
    renderWithTheme(
      <AccountCreateModal
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        account={mockAccount}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      const [url, init] = vi.mocked(globalThis.fetch).mock.calls[0];
      expect(String(url)).toMatch(/\/accounts\/acc-1/);
      expect((init as RequestInit).method).toBe("PATCH");
    });
  });
});

// ---------------------------------------------------------------------------
// CreditCard settlement fields
// ---------------------------------------------------------------------------

describe("AccountCreateModal — CreditCard settlement fields", () => {
  const mockGirokonto: AccountWithBalance = {
    id: "g-1",
    kind: "Girokonto",
    name: "Main Girokonto",
    anchorBalance: 100000,
    anchorDate: "2026-01-01",
    balance: 120000,
  };

  it("shows Funding Account dropdown when CreditCard kind is selected", () => {
    renderWithTheme(
      <AccountCreateModal
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        girokontoAccounts={[mockGirokonto]}
      />
    );

    fireEvent.change(screen.getByLabelText(/kind/i), {
      target: { value: "CreditCard" },
    });

    expect(screen.getByLabelText(/funding account/i)).toBeInTheDocument();
  });

  it("shows Settlement Day stepper when CreditCard kind is selected", () => {
    renderWithTheme(
      <AccountCreateModal
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        girokontoAccounts={[mockGirokonto]}
      />
    );

    fireEvent.change(screen.getByLabelText(/kind/i), {
      target: { value: "CreditCard" },
    });

    expect(
      screen.getByRole("button", { name: /increment/i })
    ).toBeInTheDocument();
  });

  it("hides Funding Account and Settlement Day stepper for non-CreditCard kinds", () => {
    renderWithTheme(
      <AccountCreateModal
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        girokontoAccounts={[mockGirokonto]}
      />
    );

    expect(screen.queryByLabelText(/funding account/i)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /increment/i })
    ).not.toBeInTheDocument();
  });

  it("hides both settlement fields after switching away from CreditCard", () => {
    renderWithTheme(
      <AccountCreateModal
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        girokontoAccounts={[mockGirokonto]}
      />
    );

    fireEvent.change(screen.getByLabelText(/kind/i), {
      target: { value: "CreditCard" },
    });
    fireEvent.change(screen.getByLabelText(/kind/i), {
      target: { value: "Girokonto" },
    });

    expect(screen.queryByLabelText(/funding account/i)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /increment/i })
    ).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Edit mode — CreditCard with settlement config
// ---------------------------------------------------------------------------

describe("AccountCreateModal — edit mode (CreditCard with settlement config)", () => {
  const mockGirokonto: AccountWithBalance = {
    id: "g-1",
    kind: "Girokonto",
    name: "Main Girokonto",
    anchorBalance: 100000,
    anchorDate: "2026-01-01",
    balance: 120000,
  };

  const mockCreditCard = {
    id: "cc-1",
    kind: "CreditCard" as const,
    name: "Visa",
    anchorBalance: 0,
    anchorDate: "2026-03-01",
    balance: -45000,
    linkedAccountId: "g-1",
    settlementDay: 17,
    linkedSince: "2026-03-01",
  } as AccountWithBalance;

  it("pre-fills Funding Account dropdown from account.linkedAccountId", () => {
    renderWithTheme(
      <AccountCreateModal
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        account={mockCreditCard}
        girokontoAccounts={[mockGirokonto]}
      />
    );

    expect(screen.getByLabelText(/funding account/i)).toHaveValue("g-1");
  });

  it("pre-fills Settlement Day stepper from account.settlementDay", () => {
    renderWithTheme(
      <AccountCreateModal
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        account={mockCreditCard}
        girokontoAccounts={[mockGirokonto]}
      />
    );

    expect(screen.getByText("17")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// CreditCard integration — settlement generation trigger
// ---------------------------------------------------------------------------

describe("AccountCreateModal — CreditCard settlement generation", () => {
  const mockGirokonto: AccountWithBalance = {
    id: "g-1",
    kind: "Girokonto",
    name: "Main Girokonto",
    anchorBalance: 100000,
    anchorDate: "2026-01-01",
    balance: 120000,
  };

  async function submitCreditCardForm() {
    fireEvent.change(screen.getByLabelText(/kind/i), {
      target: { value: "CreditCard" },
    });
    fireEvent.change(screen.getByLabelText(/name/i), {
      target: { value: "Visa" },
    });
    fireEvent.change(screen.getByLabelText(/as of/i), {
      target: { value: "2026-01-01" },
    });
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));
  }

  it("renders CreditCardSettlementFields when kind is CreditCard", () => {
    renderWithTheme(
      <AccountCreateModal
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        girokontoAccounts={[mockGirokonto]}
      />
    );

    fireEvent.change(screen.getByLabelText(/kind/i), {
      target: { value: "CreditCard" },
    });

    expect(screen.getByLabelText(/funding account/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /increment/i })
    ).toBeInTheDocument();
  });

  it("does not render settlement fields when kind is not CreditCard", () => {
    renderWithTheme(
      <AccountCreateModal
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        girokontoAccounts={[mockGirokonto]}
      />
    );

    expect(screen.queryByLabelText(/funding account/i)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /increment/i })
    ).not.toBeInTheDocument();
  });

  it("calls POST /settlements/generate once after a successful CreditCard account save", async () => {
    renderWithTheme(
      <AccountCreateModal
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        girokontoAccounts={[mockGirokonto]}
      />
    );

    await submitCreditCardForm();

    await waitFor(() => {
      const calls = vi.mocked(globalThis.fetch).mock.calls;
      const generateCall = calls.find(([url]) =>
        String(url).includes("/settlements/generate")
      );
      expect(generateCall).toBeDefined();
      expect((generateCall![1] as RequestInit).method).toBe("POST");
    });
  });

  it("shows the warning Snackbar when POST /settlements/generate fails", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: "new-account-id" }),
      } as Response)
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Generation failed" }),
      } as Response);

    renderWithTheme(
      <AccountCreateModal
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        girokontoAccounts={[mockGirokonto]}
      />
    );

    await submitCreditCardForm();

    expect(
      await screen.findByText(/settlement generation failed/i)
    ).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Display in Trajectory Horizon toggle
// ---------------------------------------------------------------------------

describe("AccountCreateModal — Display in Trajectory Horizon toggle", () => {
  it("shows the toggle for the default (non-Mortgage) kind", () => {
    renderWithTheme(
      <AccountCreateModal onClose={vi.fn()} onSuccess={vi.fn()} />
    );

    expect(screen.getByLabelText(/display in trajectory/i)).toBeInTheDocument();
  });

  it("hides the toggle when kind is changed to Mortgage", () => {
    renderWithTheme(
      <AccountCreateModal onClose={vi.fn()} onSuccess={vi.fn()} />
    );

    fireEvent.change(screen.getByLabelText(/kind/i), {
      target: { value: "Mortgage" },
    });

    expect(
      screen.queryByLabelText(/display in trajectory/i)
    ).not.toBeInTheDocument();
  });

  it("defaults the toggle on, submitting showInTrajectory: true for a new account", async () => {
    renderWithTheme(
      <AccountCreateModal onClose={vi.fn()} onSuccess={vi.fn()} />
    );

    fireEvent.change(screen.getByLabelText(/name/i), {
      target: { value: "Main" },
    });
    fireEvent.change(screen.getByLabelText(/as of/i), {
      target: { value: "2026-01-01" },
    });
    fireEvent.click(screen.getByRole("button", { name: /create|add|save/i }));

    await waitFor(() => {
      const calls = vi.mocked(globalThis.fetch).mock.calls;
      const body = JSON.parse(
        (calls[calls.length - 1][1] as RequestInit).body as string
      );
      expect(body.showInTrajectory).toBe(true);
    });
  });

  it("submits showInTrajectory: false after the toggle is turned off", async () => {
    renderWithTheme(
      <AccountCreateModal onClose={vi.fn()} onSuccess={vi.fn()} />
    );

    fireEvent.click(screen.getByLabelText(/display in trajectory/i));
    fireEvent.change(screen.getByLabelText(/name/i), {
      target: { value: "Main" },
    });
    fireEvent.change(screen.getByLabelText(/as of/i), {
      target: { value: "2026-01-01" },
    });
    fireEvent.click(screen.getByRole("button", { name: /create|add|save/i }));

    await waitFor(() => {
      const calls = vi.mocked(globalThis.fetch).mock.calls;
      const body = JSON.parse(
        (calls[calls.length - 1][1] as RequestInit).body as string
      );
      expect(body.showInTrajectory).toBe(false);
    });
  });

  it("pre-populates the toggle from account.showInTrajectory in edit mode", () => {
    const hiddenAccount: AccountWithBalance = {
      id: "acc-9",
      kind: "Girokonto",
      name: "Hidden",
      anchorBalance: 100000,
      anchorDate: "2026-01-01",
      balance: 100000,
      showInTrajectory: false,
    };

    renderWithTheme(
      <AccountCreateModal
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        account={hiddenAccount}
      />
    );

    expect(screen.getByLabelText(/display in trajectory/i)).not.toBeChecked();
  });
});

// ---------------------------------------------------------------------------
// Balance Anchor — re-anchoring in the account form (#231)
// ---------------------------------------------------------------------------

const ANCHOR_HELP_TEXT =
  "Your balance at the end of this day, including that day's transactions";

/** A local date `days` from today, as the DD.MM.YYYY the DatePicker displays. */
function displayDateDaysFromToday(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}.${mm}.${d.getFullYear()}`;
}

function lastRequestBody(): Record<string, unknown> {
  const calls = vi.mocked(globalThis.fetch).mock.calls;
  const [, init] = calls[calls.length - 1];
  return JSON.parse(String((init as RequestInit).body)) as Record<
    string,
    unknown
  >;
}

describe("AccountCreateModal — Balance Anchor fields", () => {
  const anchoredAccount: AccountWithBalance = {
    id: "acc-1",
    kind: "Girokonto",
    name: "Main Account",
    anchorBalance: 100000,
    anchorDate: "2024-03-15",
    balance: 120000,
  };

  it("labels the anchor fields Balance and As of, with the help text, on create", () => {
    renderWithTheme(
      <AccountCreateModal onClose={vi.fn()} onSuccess={vi.fn()} />
    );

    expect(screen.getByText(/^balance$/i)).toBeInTheDocument();
    expect(screen.getByText(/^as of$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^balance$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/as of/i)).toBeInTheDocument();
    expect(screen.getByText(ANCHOR_HELP_TEXT)).toBeInTheDocument();
    expect(screen.queryByText(/opening balance/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/opening date/i)).not.toBeInTheDocument();
  });

  it("labels the anchor fields Balance and As of, with the help text, in edit mode", () => {
    renderWithTheme(
      <AccountCreateModal
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        account={anchoredAccount}
      />
    );

    expect(screen.getByLabelText(/^balance$/i)).toHaveValue(1000);
    expect(screen.getByLabelText(/as of/i)).toHaveValue("15.03.2024");
    expect(screen.getByText(ANCHOR_HELP_TEXT)).toBeInTheDocument();
  });

  it("caps the As of date at today: a later date is not taken", async () => {
    renderWithTheme(
      <AccountCreateModal
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        account={anchoredAccount}
      />
    );

    fireEvent.change(screen.getByLabelText(/as of/i), {
      target: { value: displayDateDaysFromToday(3) },
    });
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalled();
    });
    expect(lastRequestBody().anchorDate).toBe("2024-03-15");
  });

  it("submits a changed anchorDate and anchorBalance in edit mode", async () => {
    renderWithTheme(
      <AccountCreateModal
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        account={anchoredAccount}
      />
    );

    fireEvent.change(screen.getByLabelText(/^balance$/i), {
      target: { value: "2543.21" },
    });
    fireEvent.change(screen.getByLabelText(/as of/i), {
      target: { value: "31.03.2026" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalled();
    });
    const [url, init] = vi.mocked(globalThis.fetch).mock.calls[0];
    expect(String(url)).toMatch(/\/accounts\/acc-1$/);
    expect((init as RequestInit).method).toBe("PATCH");
    expect(lastRequestBody()).toMatchObject({
      anchorBalance: 254321,
      anchorDate: "2026-03-31",
    });
  });
});

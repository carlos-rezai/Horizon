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
      openingBalance: 0,
      openingDate: "2026-01-01",
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

    fireEvent.change(screen.getByLabelText(/opening date/i), {
      target: { value: "2026-01-01" },
    });
    fireEvent.click(screen.getByRole("button", { name: /create|add|save/i }));

    expect(fetch).not.toHaveBeenCalled();
  });

  it("does not call the API when opening date is empty", () => {
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
    fireEvent.change(screen.getByLabelText(/opening balance/i), {
      target: { value: "1000.00" },
    });
    fireEvent.change(screen.getByLabelText(/opening date/i), {
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
    fireEvent.change(screen.getByLabelText(/opening date/i), {
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
    fireEvent.change(screen.getByLabelText(/opening date/i), {
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
    fireEvent.change(screen.getByLabelText(/opening date/i), {
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
    fireEvent.change(screen.getByLabelText(/opening date/i), {
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
    fireEvent.change(screen.getByLabelText(/opening date/i), {
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
    openingBalance: 100000,
    openingDate: "2024-03-15",
    balance: 120000,
  };

  it("pre-populates name, opening balance, opening date, and kind from the account prop", () => {
    renderWithTheme(
      <AccountCreateModal
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        account={mockAccount}
      />
    );

    expect(screen.getByLabelText(/name/i)).toHaveValue("Main Account");
    expect(screen.getByLabelText(/opening balance/i)).toHaveValue(1000);
    expect(screen.getByLabelText(/opening date/i)).toHaveValue("15.03.2024");
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

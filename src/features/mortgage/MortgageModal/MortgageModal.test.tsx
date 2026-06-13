// @vitest-environment jsdom
import {
  render,
  screen,
  cleanup,
  fireEvent,
  waitFor,
} from "@testing-library/react";
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { ThemeProvider } from "styled-components";
import { theme } from "../../../tokens";
import type { AccountWithBalance } from "../../../types/account";
import MortgageModal from "./MortgageModal";

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
}

// A Mortgage whose current Restschuld (balance) is 200,000 € (20,000,000 cents),
// originated at 400,000 € (40,000,000 cents) — i.e. 50% paid off.
const mortgage = {
  id: "m-1",
  kind: "Mortgage" as const,
  name: "Haus",
  openingBalance: 20000000,
  openingDate: "2026-01-01",
  balance: 20000000,
  originalPrincipal: 40000000,
  startDate: "2020-06-01",
  termYears: 25,
} as AccountWithBalance;

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

beforeEach(() => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue({
    ok: true,
    json: async () => ({ ...mortgage }),
  } as Response);
});

describe("MortgageModal — fields", () => {
  it("renders original principal, start date, and term inputs", () => {
    renderWithTheme(
      <MortgageModal account={mortgage} onClose={vi.fn()} onSuccess={vi.fn()} />
    );

    expect(screen.getByLabelText(/original principal/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/start date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/term/i)).toBeInTheDocument();
  });

  it("pre-populates the fields from the account's origination values", () => {
    renderWithTheme(
      <MortgageModal account={mortgage} onClose={vi.fn()} onSuccess={vi.fn()} />
    );

    // 40,000,000 cents → 400,000 € shown in the principal field.
    expect(screen.getByLabelText(/original principal/i)).toHaveValue(400000);
    expect(screen.getByLabelText(/term/i)).toHaveValue(25);
  });
});

describe("MortgageModal — live percentage preview", () => {
  it("shows the percentage paid off derived from the current Restschuld", () => {
    // principal 400k, Restschuld 200k → 50% paid off.
    renderWithTheme(
      <MortgageModal account={mortgage} onClose={vi.fn()} onSuccess={vi.fn()} />
    );

    expect(screen.getByText(/50\s*%/)).toBeInTheDocument();
  });

  it("updates the preview live as the principal changes", () => {
    renderWithTheme(
      <MortgageModal account={mortgage} onClose={vi.fn()} onSuccess={vi.fn()} />
    );

    // principal 800k, Restschuld 200k → 75% paid off.
    fireEvent.change(screen.getByLabelText(/original principal/i), {
      target: { value: "800000" },
    });

    expect(screen.getByText(/75\s*%/)).toBeInTheDocument();
  });
});

describe("MortgageModal — submission", () => {
  it("PATCHes /accounts/:id/mortgage with a cents principal and calls onSuccess", async () => {
    const onSuccess = vi.fn();
    renderWithTheme(
      <MortgageModal
        account={mortgage}
        onClose={vi.fn()}
        onSuccess={onSuccess}
      />
    );

    fireEvent.change(screen.getByLabelText(/original principal/i), {
      target: { value: "450000" },
    });
    fireEvent.change(screen.getByLabelText(/term/i), {
      target: { value: "30" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      const [url, init] = vi.mocked(globalThis.fetch).mock.calls[0];
      expect(String(url)).toMatch(/\/accounts\/m-1\/mortgage/);
      expect((init as RequestInit).method).toBe("PATCH");
      const body = JSON.parse((init as RequestInit).body as string);
      expect(body.originalPrincipal).toBe(45000000);
      expect(body.termYears).toBe(30);
    });
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
  });

  it("blocks submission and does not call the API when principal is below the Restschuld", () => {
    renderWithTheme(
      <MortgageModal account={mortgage} onClose={vi.fn()} onSuccess={vi.fn()} />
    );

    // 100k principal < 200k Restschuld → impossible origination.
    fireEvent.change(screen.getByLabelText(/original principal/i), {
      target: { value: "100000" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    expect(fetch).not.toHaveBeenCalled();
  });

  it("calls onClose when the cancel button is clicked", () => {
    const onClose = vi.fn();
    renderWithTheme(
      <MortgageModal account={mortgage} onClose={onClose} onSuccess={vi.fn()} />
    );

    fireEvent.click(screen.getByRole("button", { name: /cancel|close/i }));

    expect(onClose).toHaveBeenCalled();
  });
});

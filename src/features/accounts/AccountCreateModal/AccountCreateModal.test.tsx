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
      _id: "new-account-id",
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

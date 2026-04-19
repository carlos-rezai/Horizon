// @vitest-environment jsdom
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, afterEach, vi } from "vitest";
import { ThemeProvider } from "styled-components";
import { theme } from "../../../tokens";
import AccountDetailHeader from "./AccountDetailHeader";
import type { AccountWithBalance } from "../../../types/account";

afterEach(() => {
  cleanup();
});

const account: AccountWithBalance = {
  _id: "acc-1",
  kind: "Girokonto",
  name: "Main Checking",
  openingBalance: 100000,
  openingDate: "2026-01-01",
  balance: 150000,
};

const renderHeader = (
  overrides: Partial<{
    hasTransactions: boolean;
    onRename: (name: string) => Promise<void>;
    onUpdateOpeningBalance: (openingBalance: number) => Promise<void>;
    onDelete: () => Promise<void>;
  }> = {}
) => {
  const props = {
    account,
    hasTransactions: false,
    onRename: vi.fn().mockResolvedValue(undefined),
    onUpdateOpeningBalance: vi.fn().mockResolvedValue(undefined),
    onDelete: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
  render(
    <ThemeProvider theme={theme}>
      <MemoryRouter>
        <AccountDetailHeader {...props} />
      </MemoryRouter>
    </ThemeProvider>
  );
  return props;
};

describe("AccountDetailHeader — display", () => {
  it("renders the account name", () => {
    renderHeader();
    expect(screen.getByText("Main Checking")).toBeInTheDocument();
  });

  it("renders the current balance formatted in euros", () => {
    renderHeader();
    // 150000 cents = 1.500,00 € — match on the numeric part
    expect(screen.getByText(/1[.,]500/)).toBeInTheDocument();
  });
});

describe("AccountDetailHeader — rename", () => {
  it("reveals an input pre-filled with the current name when rename is activated", () => {
    renderHeader();

    fireEvent.click(screen.getByRole("button", { name: /edit account name/i }));

    const input = screen.getByDisplayValue("Main Checking");
    expect(input).toBeInTheDocument();
  });

  it("calls onRename with the new name when saved", async () => {
    const { onRename } = renderHeader();

    fireEvent.click(screen.getByRole("button", { name: /edit account name/i }));
    fireEvent.change(screen.getByDisplayValue("Main Checking"), {
      target: { value: "Salary Account" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    expect(onRename).toHaveBeenCalledWith("Salary Account");
  });

  it("shows an error message when onRename rejects", async () => {
    renderHeader({
      onRename: vi.fn().mockRejectedValue(new Error("Rename failed")),
    });

    fireEvent.click(screen.getByRole("button", { name: /edit account name/i }));
    fireEvent.change(screen.getByDisplayValue("Main Checking"), {
      target: { value: "Salary Account" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    expect(await screen.findByText(/rename failed/i)).toBeInTheDocument();
  });
});

describe("AccountDetailHeader — opening balance editing", () => {
  it("reveals an input when edit opening balance is activated", () => {
    renderHeader();

    fireEvent.click(
      screen.getByRole("button", { name: /edit opening balance/i })
    );

    expect(screen.getByLabelText(/opening balance/i)).toBeInTheDocument();
  });

  it("calls onUpdateOpeningBalance with the value in cents when saved", async () => {
    const { onUpdateOpeningBalance } = renderHeader();

    fireEvent.click(
      screen.getByRole("button", { name: /edit opening balance/i })
    );
    fireEvent.change(screen.getByLabelText(/opening balance/i), {
      target: { value: "2000" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    expect(onUpdateOpeningBalance).toHaveBeenCalledWith(200000);
  });

  it("shows an error when onUpdateOpeningBalance rejects", async () => {
    renderHeader({
      onUpdateOpeningBalance: vi
        .fn()
        .mockRejectedValue(new Error("Update failed")),
    });

    fireEvent.click(
      screen.getByRole("button", { name: /edit opening balance/i })
    );
    fireEvent.change(screen.getByLabelText(/opening balance/i), {
      target: { value: "2000" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    expect(await screen.findByText(/update failed/i)).toBeInTheDocument();
  });
});

describe("AccountDetailHeader — delete", () => {
  it("disables the delete button when the account has transactions", () => {
    renderHeader({ hasTransactions: true });

    expect(screen.getByRole("button", { name: /delete/i })).toBeDisabled();
  });

  it("shows an explanation when the delete button is disabled", () => {
    renderHeader({ hasTransactions: true });

    const deleteButton = screen.getByRole("button", { name: /delete/i });
    const hasExplanation =
      deleteButton.hasAttribute("title") ||
      deleteButton.hasAttribute("aria-describedby") ||
      screen.queryByText(/transaction/i) !== null;

    expect(hasExplanation).toBe(true);
  });

  it("shows a confirmation prompt when delete is clicked and the account has no transactions", () => {
    renderHeader({ hasTransactions: false });

    fireEvent.click(screen.getByRole("button", { name: /delete/i }));

    expect(
      screen.getByRole("button", { name: /confirm/i })
    ).toBeInTheDocument();
  });

  it("calls onDelete when the confirmation is confirmed", async () => {
    const { onDelete } = renderHeader({ hasTransactions: false });

    fireEvent.click(screen.getByRole("button", { name: /delete/i }));
    fireEvent.click(screen.getByRole("button", { name: /confirm/i }));

    expect(onDelete).toHaveBeenCalled();
  });

  it("shows an error message when onDelete rejects", async () => {
    renderHeader({
      hasTransactions: false,
      onDelete: vi.fn().mockRejectedValue(new Error("Delete failed")),
    });

    fireEvent.click(screen.getByRole("button", { name: /delete/i }));
    fireEvent.click(screen.getByRole("button", { name: /confirm/i }));

    expect(await screen.findByText(/delete failed/i)).toBeInTheDocument();
  });
});

// @vitest-environment jsdom
import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import { ThemeProvider } from "styled-components";
import { theme } from "../../tokens";
import EmptyState from "./EmptyState";

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
}

afterEach(() => {
  cleanup();
});

describe("EmptyState", () => {
  it("renders its title", () => {
    renderWithTheme(<EmptyState title="No transactions yet" />);
    expect(screen.getByText("No transactions yet")).toBeInTheDocument();
  });

  it("renders the icon slot", () => {
    renderWithTheme(
      <EmptyState
        icon={<svg data-testid="empty-icon" />}
        title="No transactions yet"
      />
    );
    expect(screen.getByTestId("empty-icon")).toBeInTheDocument();
  });

  it("renders a hint when provided", () => {
    renderWithTheme(
      <EmptyState
        title="No transactions yet"
        hint="Add your first variable expense for this month."
      />
    );
    expect(
      screen.getByText("Add your first variable expense for this month.")
    ).toBeInTheDocument();
  });

  it("renders an action slot when provided", () => {
    renderWithTheme(
      <EmptyState
        title="No transactions yet"
        action={<button>Add transaction</button>}
      />
    );
    expect(
      screen.getByRole("button", { name: "Add transaction" })
    ).toBeInTheDocument();
  });
});

describe("EmptyState — export", () => {
  it("is importable from src/components/index.ts", async () => {
    const { EmptyState: EmptyStateFromIndex } = await import("../index");
    expect(() =>
      renderWithTheme(<EmptyStateFromIndex title="Nothing here" />)
    ).not.toThrow();
  });
});

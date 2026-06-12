// @vitest-environment jsdom
import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import { ThemeProvider } from "styled-components";
import { theme } from "../../tokens";
import SectionHead from "./SectionHead";

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
}

afterEach(() => {
  cleanup();
});

describe("SectionHead", () => {
  it("renders its title", () => {
    renderWithTheme(<SectionHead title="Recurring this month" />);
    expect(screen.getByText("Recurring this month")).toBeInTheDocument();
  });

  it("renders its overline label", () => {
    renderWithTheme(<SectionHead label="Commitments" title="Recurring" />);
    expect(screen.getByText("Commitments")).toBeInTheDocument();
  });

  it("renders the right-hand slot", () => {
    renderWithTheme(
      <SectionHead title="Accounts" right={<button>Add account</button>} />
    );
    expect(
      screen.getByRole("button", { name: "Add account" })
    ).toBeInTheDocument();
  });
});

describe("SectionHead — export", () => {
  it("is importable from src/components/index.ts", async () => {
    const { SectionHead: SectionHeadFromIndex } = await import("../index");
    expect(() =>
      renderWithTheme(<SectionHeadFromIndex title="Accounts" />)
    ).not.toThrow();
  });
});

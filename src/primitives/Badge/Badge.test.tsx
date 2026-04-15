// @vitest-environment jsdom
import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import { ThemeProvider } from "styled-components";
import { theme } from "../../tokens";
import Badge from "./Badge";

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
}

afterEach(() => {
  cleanup();
});

describe("Badge — label text", () => {
  it("renders 'Girokonto' for kind Girokonto", () => {
    renderWithTheme(<Badge kind="Girokonto" />);
    expect(screen.getByText("Girokonto")).toBeInTheDocument();
  });

  it("renders 'Tagesgeld' for kind Tagesgeld", () => {
    renderWithTheme(<Badge kind="Tagesgeld" />);
    expect(screen.getByText("Tagesgeld")).toBeInTheDocument();
  });

  it("renders 'Mortgage' for kind Mortgage", () => {
    renderWithTheme(<Badge kind="Mortgage" />);
    expect(screen.getByText("Mortgage")).toBeInTheDocument();
  });

  it("renders 'CreditCard' for kind CreditCard", () => {
    renderWithTheme(<Badge kind="CreditCard" />);
    expect(screen.getByText("CreditCard")).toBeInTheDocument();
  });

  it("renders 'Investment' for kind Investment", () => {
    renderWithTheme(<Badge kind="Investment" />);
    expect(screen.getByText("Investment")).toBeInTheDocument();
  });
});

describe("Badge — colour tint contract", () => {
  it("sets data-kind='Girokonto' on the root element", () => {
    const { container } = renderWithTheme(<Badge kind="Girokonto" />);
    expect(container.firstChild).toHaveAttribute("data-kind", "Girokonto");
  });

  it("sets data-kind='Tagesgeld' on the root element", () => {
    const { container } = renderWithTheme(<Badge kind="Tagesgeld" />);
    expect(container.firstChild).toHaveAttribute("data-kind", "Tagesgeld");
  });

  it("sets data-kind='Mortgage' on the root element", () => {
    const { container } = renderWithTheme(<Badge kind="Mortgage" />);
    expect(container.firstChild).toHaveAttribute("data-kind", "Mortgage");
  });

  it("sets data-kind='CreditCard' on the root element", () => {
    const { container } = renderWithTheme(<Badge kind="CreditCard" />);
    expect(container.firstChild).toHaveAttribute("data-kind", "CreditCard");
  });

  it("sets data-kind='Investment' on the root element", () => {
    const { container } = renderWithTheme(<Badge kind="Investment" />);
    expect(container.firstChild).toHaveAttribute("data-kind", "Investment");
  });
});

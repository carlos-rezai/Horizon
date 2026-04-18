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

describe("Badge", () => {
  describe("unit", () => {
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
});

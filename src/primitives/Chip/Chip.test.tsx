// @vitest-environment jsdom
import { render, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import { ThemeProvider, StyleSheetManager } from "styled-components";
import { theme } from "../../tokens";
import Chip from "./Chip";
// Domain-agnostic constraint: Chip must not import from types/account,
// tokens/colors, or any feature layer — enforced by code review.

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
}

function renderForCSS(ui: React.ReactElement) {
  return render(
    <StyleSheetManager disableCSSOMInjection>
      <ThemeProvider theme={theme}>{ui}</ThemeProvider>
    </StyleSheetManager>
  );
}

function getInjectedCSS(): string {
  return Array.from(document.querySelectorAll("style"))
    .map((el) => el.textContent ?? "")
    .join("\n");
}

afterEach(() => {
  cleanup();
});

describe("Chip", () => {
  describe("unit", () => {
    it("renders without error given a hex color and no size", () => {
      expect(() => renderWithTheme(<Chip color="#4A90E2" />)).not.toThrow();
    });

    it("renders without error with size='sm'", () => {
      expect(() =>
        renderWithTheme(<Chip color="#4A90E2" size="sm" />)
      ).not.toThrow();
    });

    it("renders without error with size='md'", () => {
      expect(() =>
        renderWithTheme(<Chip color="#4A90E2" size="md" />)
      ).not.toThrow();
    });
  });

  describe("styles", () => {
    it("applies the supplied hex color as background-color", () => {
      renderForCSS(<Chip color="#4A90E2" />);
      expect(getInjectedCSS()).toContain("#4A90E2");
    });

    it("renders as a pill with 9999px border-radius", () => {
      renderForCSS(<Chip color="#4A90E2" />);
      expect(getInjectedCSS()).toContain("9999");
    });
  });
});

describe("Chip — export", () => {
  it("is importable from src/primitives/index.ts and renders without error", async () => {
    const { Chip: ChipFromIndex } = await import("../index");
    expect(() =>
      renderWithTheme(<ChipFromIndex color="#E24A4A" />)
    ).not.toThrow();
  });
});

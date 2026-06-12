// @vitest-environment jsdom
import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import { ThemeProvider, StyleSheetManager } from "styled-components";
import { theme } from "../../tokens";
import ProgressBar from "./ProgressBar";

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

describe("ProgressBar — value", () => {
  it("exposes an accessible progressbar role with min/now/max", () => {
    renderWithTheme(<ProgressBar value={50} />);
    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-valuenow", "50");
    expect(bar).toHaveAttribute("aria-valuemin", "0");
    expect(bar).toHaveAttribute("aria-valuemax", "100");
  });

  it("renders the fill at the value percentage", () => {
    renderForCSS(<ProgressBar value={50} />);
    expect(getInjectedCSS()).toContain("width:50%");
  });

  it("clamps values above 100", () => {
    const { rerender } = renderWithTheme(<ProgressBar value={150} />);
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "100"
    );
    rerender(
      <StyleSheetManager disableCSSOMInjection>
        <ThemeProvider theme={theme}>
          <ProgressBar value={150} />
        </ThemeProvider>
      </StyleSheetManager>
    );
    expect(getInjectedCSS()).toContain("width:100%");
  });

  it("clamps values below 0", () => {
    renderWithTheme(<ProgressBar value={-10} />);
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "0"
    );
  });
});

describe("ProgressBar — styles", () => {
  it("uses the supplied fill colour", () => {
    renderForCSS(<ProgressBar value={40} color="#74C29B" />);
    expect(getInjectedCSS()).toContain("#74C29B");
  });

  it("uses the supplied track colour", () => {
    renderForCSS(<ProgressBar value={40} track="#1C212A" />);
    expect(getInjectedCSS()).toContain("#1C212A");
  });

  it("honours the height prop", () => {
    renderForCSS(<ProgressBar value={40} height={8} />);
    expect(getInjectedCSS()).toContain("8px");
  });
});

describe("ProgressBar — export", () => {
  it("is importable from src/primitives/index.ts", async () => {
    const { ProgressBar: BarFromIndex } = await import("../index");
    expect(() => renderWithTheme(<BarFromIndex value={10} />)).not.toThrow();
  });
});

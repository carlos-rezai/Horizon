// @vitest-environment jsdom
import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { ThemeProvider, StyleSheetManager } from "styled-components";
import { theme } from "../../tokens";
import FadeSwap from "./FadeSwap";

const REDUCE_QUERY = "(prefers-reduced-motion: reduce)";

/** jsdom ships no matchMedia; the preference is stubbed at the window. */
function stubReducedMotion(matches: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query === REDUCE_QUERY ? matches : false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}

function renderSwap(ui: React.ReactElement) {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
}

function renderForCSS(ui: React.ReactElement) {
  return render(
    <StyleSheetManager disableCSSOMInjection>
      <ThemeProvider theme={theme}>{ui}</ThemeProvider>
    </StyleSheetManager>
  );
}

/** Injected CSS for the rendered wrapper's *own* classes, whitespace removed.
 *  Scoped to those classes because styled-components keeps every rule it has
 *  injected in the document, so an earlier render's variant would otherwise
 *  leak into a later assertion. */
function getSwapCSS(testId: string): string {
  const allCSS = Array.from(document.querySelectorAll("style"))
    .map((el) => el.textContent ?? "")
    .join("\n")
    .replace(/\s/g, "");

  return Array.from(screen.getByTestId(testId).classList)
    .flatMap(
      (cls) => allCSS.match(new RegExp(`\\.${cls}\\{[^}]*\\}`, "g")) ?? []
    )
    .join("");
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("FadeSwap — unit", () => {
  it("renders its children", () => {
    stubReducedMotion(false);
    renderSwap(
      <FadeSwap testId="swap" swapKey="june">
        <p>June spending</p>
      </FadeSwap>
    );

    expect(screen.getByText("June spending")).toBeInTheDocument();
  });

  it("holds the same element across a re-render with an unchanged key", () => {
    stubReducedMotion(false);
    const { rerender } = renderSwap(
      <FadeSwap testId="swap" swapKey="june">
        <p>June spending</p>
      </FadeSwap>
    );
    const before = screen.getByTestId("swap");

    rerender(
      <ThemeProvider theme={theme}>
        <FadeSwap testId="swap" swapKey="june">
          <p>June spending — one more row</p>
        </FadeSwap>
      </ThemeProvider>
    );

    // Same key, so the content updates in place rather than replaying a fade
    // on every unrelated render.
    expect(
      screen.getByText("June spending — one more row")
    ).toBeInTheDocument();
    expect(screen.getByTestId("swap")).toBe(before);
  });

  it("replays the fade on a fresh element when the key changes", () => {
    stubReducedMotion(false);
    const { rerender } = renderSwap(
      <FadeSwap testId="swap" swapKey="june">
        <p>June spending</p>
      </FadeSwap>
    );
    const before = screen.getByTestId("swap");

    rerender(
      <ThemeProvider theme={theme}>
        <FadeSwap testId="swap" swapKey="july">
          <p>July spending</p>
        </FadeSwap>
      </ThemeProvider>
    );

    expect(screen.getByText("July spending")).toBeInTheDocument();
    expect(screen.getByTestId("swap")).not.toBe(before);
  });
});

describe("FadeSwap — reduced motion", () => {
  it("marks its motion as active when no preference is set", () => {
    stubReducedMotion(false);
    renderSwap(
      <FadeSwap testId="swap" swapKey="june">
        <p>June spending</p>
      </FadeSwap>
    );

    expect(screen.getByTestId("swap")).toHaveAttribute("data-motion", "fade");
  });

  it("suppresses its motion when reduced motion is preferred", () => {
    stubReducedMotion(true);
    renderSwap(
      <FadeSwap testId="swap" swapKey="june">
        <p>June spending</p>
      </FadeSwap>
    );

    expect(screen.getByTestId("swap")).toHaveAttribute("data-motion", "none");
  });

  it("still swaps its content instantly when motion is suppressed", () => {
    stubReducedMotion(true);
    const { rerender } = renderSwap(
      <FadeSwap testId="swap" swapKey="june">
        <p>June spending</p>
      </FadeSwap>
    );

    rerender(
      <ThemeProvider theme={theme}>
        <FadeSwap testId="swap" swapKey="july">
          <p>July spending</p>
        </FadeSwap>
      </ThemeProvider>
    );

    // Reduced motion removes the fade, never the content.
    expect(screen.getByText("July spending")).toBeInTheDocument();
    expect(screen.queryByText("June spending")).not.toBeInTheDocument();
  });
});

describe("FadeSwap — styles", () => {
  it("times its fade from the Meridian motion token", () => {
    stubReducedMotion(false);
    renderForCSS(
      <FadeSwap testId="swap" swapKey="june">
        <p>June spending</p>
      </FadeSwap>
    );

    expect(getSwapCSS("swap")).toContain(theme.transitions.swapDuration);
  });

  it("animates nothing when reduced motion is preferred", () => {
    stubReducedMotion(true);
    renderForCSS(
      <FadeSwap testId="swap" swapKey="june">
        <p>June spending</p>
      </FadeSwap>
    );

    expect(getSwapCSS("swap")).not.toContain("animation:");
  });
});

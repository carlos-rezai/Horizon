// @vitest-environment jsdom
import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import { ThemeProvider, StyleSheetManager } from "styled-components";
import { theme } from "../../tokens";
import Skeleton from "./Skeleton";

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

/** Injected CSS for the rendered skeleton's *own* classes, with all whitespace
 *  removed. Scoped to those classes because styled-components keeps every rule
 *  it has injected in the document, so an earlier render's variant would
 *  otherwise leak into a later assertion. */
function getSkeletonCSS(): string {
  const allCSS = Array.from(document.querySelectorAll("style"))
    .map((el) => el.textContent ?? "")
    .join("\n")
    .replace(/\s/g, "");

  return Array.from(screen.getByTestId("skeleton").classList)
    .flatMap(
      (cls) => allCSS.match(new RegExp(`\\.${cls}\\{[^}]*\\}`, "g")) ?? []
    )
    .join("");
}

afterEach(() => {
  cleanup();
});

describe("Skeleton — unit", () => {
  it("renders a placeholder element", () => {
    renderWithTheme(<Skeleton />);
    expect(screen.getByTestId("skeleton")).toBeInTheDocument();
  });

  it("is inert — hidden from assistive tech, with no text and nothing focusable", () => {
    renderWithTheme(<Skeleton width={200} height={20} />);

    const skeleton = screen.getByTestId("skeleton");
    expect(skeleton).toHaveAttribute("aria-hidden", "true");
    expect(skeleton).not.toHaveAttribute("role");
    expect(skeleton.textContent).toBe("");
    expect(
      skeleton.querySelector("a, button, input, select, textarea, [tabindex]")
    ).toBeNull();
  });

  it("sizes itself from numeric width and height props", () => {
    renderWithTheme(<Skeleton width={120} height={16} />);

    const skeleton = screen.getByTestId("skeleton");
    expect(skeleton.style.width).toBe("120px");
    expect(skeleton.style.height).toBe("16px");
  });

  it("passes CSS length strings through untouched", () => {
    renderWithTheme(<Skeleton width="50%" height="2rem" />);

    const skeleton = screen.getByTestId("skeleton");
    expect(skeleton.style.width).toBe("50%");
    expect(skeleton.style.height).toBe("2rem");
  });
});

describe("Skeleton — styles", () => {
  it("tints itself from a Meridian surface token", () => {
    renderForCSS(<Skeleton />);
    expect(getSkeletonCSS()).toContain(theme.colors.surfaceContainerHigh);
  });

  it("renders a circle shape as a full-radius pill", () => {
    renderForCSS(<Skeleton shape="circle" width={38} height={38} />);
    expect(getSkeletonCSS()).toContain("border-radius:50%");
  });

  it("renders a rect shape with a corner radius rather than a circle", () => {
    renderForCSS(<Skeleton shape="rect" width={200} height={80} />);
    expect(getSkeletonCSS()).not.toContain("border-radius:50%");
  });
});

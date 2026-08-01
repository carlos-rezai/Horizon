// @vitest-environment jsdom
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { ThemeProvider, StyleSheetManager } from "styled-components";
import { theme } from "../../../tokens";
import { MANUAL_TOPICS } from "../manualContent";
import ManualDrawer from "./ManualDrawer";

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

function renderDrawer(ui: React.ReactElement) {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
}

function renderForCSS(ui: React.ReactElement) {
  return render(
    <StyleSheetManager disableCSSOMInjection>
      <ThemeProvider theme={theme}>{ui}</ThemeProvider>
    </StyleSheetManager>
  );
}

/** Injected CSS for one element's own classes, whitespace removed. Scoped to
 *  those classes because styled-components keeps every rule it has injected in
 *  the document, so an earlier render's variant would otherwise leak in. */
function getElementCSS(testId: string): string {
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

describe("ManualDrawer — the overlay", () => {
  it("is announced as a dialog named User Manual", () => {
    stubReducedMotion(false);
    renderDrawer(<ManualDrawer open onClose={vi.fn()} />);

    const dialog = screen.getByRole("dialog", { name: /user manual/i });
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute("aria-modal", "true");
  });

  it("renders a backdrop behind the panel", () => {
    stubReducedMotion(false);
    renderDrawer(<ManualDrawer open onClose={vi.fn()} />);

    expect(screen.getByTestId("manual-backdrop")).toBeInTheDocument();
  });
});

describe("ManualDrawer — content", () => {
  it("renders the Getting Started topic title", () => {
    stubReducedMotion(false);
    renderDrawer(<ManualDrawer open onClose={vi.fn()} />);

    expect(screen.getByText(MANUAL_TOPICS.start.title)).toBeInTheDocument();
  });

  it("renders the Getting Started blurb, so a reader can judge the topic before expanding anything", () => {
    stubReducedMotion(false);
    renderDrawer(<ManualDrawer open onClose={vi.fn()} />);

    expect(screen.getByText(MANUAL_TOPICS.start.blurb)).toBeInTheDocument();
  });

  it("renders the topic's icon", () => {
    stubReducedMotion(false);
    renderDrawer(<ManualDrawer open onClose={vi.fn()} />);

    expect(
      screen.getAllByTestId("manual-topic-icon")[0].querySelector("svg")
    ).toBeInTheDocument();
  });
});

describe("ManualDrawer — dismissal", () => {
  it("closes from the header close button", () => {
    stubReducedMotion(false);
    const onClose = vi.fn();
    renderDrawer(<ManualDrawer open onClose={onClose} />);

    fireEvent.click(screen.getByRole("button", { name: /close/i }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes when the backdrop is clicked", () => {
    stubReducedMotion(false);
    const onClose = vi.fn();
    renderDrawer(<ManualDrawer open onClose={onClose} />);

    fireEvent.click(screen.getByTestId("manual-backdrop"));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("stays open when the panel itself is clicked", () => {
    stubReducedMotion(false);
    const onClose = vi.fn();
    renderDrawer(<ManualDrawer open onClose={onClose} />);

    fireEvent.click(screen.getByText(MANUAL_TOPICS.start.title));

    expect(onClose).not.toHaveBeenCalled();
  });
});

describe("ManualDrawer — motion", () => {
  it("marks the panel open while it is open", () => {
    stubReducedMotion(false);
    renderDrawer(<ManualDrawer open onClose={vi.fn()} />);

    expect(screen.getByTestId("manual-panel")).toHaveAttribute(
      "data-state",
      "open"
    );
  });

  it("marks the panel closed while it animates back out, before its parent unmounts it", () => {
    stubReducedMotion(false);
    const { rerender } = renderDrawer(<ManualDrawer open onClose={vi.fn()} />);

    rerender(
      <ThemeProvider theme={theme}>
        <ManualDrawer open={false} onClose={vi.fn()} />
      </ThemeProvider>
    );

    expect(screen.getByTestId("manual-panel")).toHaveAttribute(
      "data-state",
      "closed"
    );
  });

  it("slides when no motion preference is set", () => {
    stubReducedMotion(false);
    renderDrawer(<ManualDrawer open onClose={vi.fn()} />);

    expect(screen.getByTestId("manual-panel")).toHaveAttribute(
      "data-motion",
      "slide"
    );
  });

  it("does not slide when reduced motion is preferred", () => {
    stubReducedMotion(true);
    renderDrawer(<ManualDrawer open onClose={vi.fn()} />);

    expect(screen.getByTestId("manual-panel")).toHaveAttribute(
      "data-motion",
      "none"
    );
  });

  it("still renders its content when motion is suppressed", () => {
    stubReducedMotion(true);
    renderDrawer(<ManualDrawer open onClose={vi.fn()} />);

    // Reduced motion removes the slide, never the manual.
    expect(screen.getByText(MANUAL_TOPICS.start.title)).toBeInTheDocument();
  });
});

describe("ManualDrawer — styles", () => {
  it("moves the panel horizontally when motion is allowed", () => {
    stubReducedMotion(false);
    renderForCSS(<ManualDrawer open onClose={vi.fn()} />);

    expect(getElementCSS("manual-panel")).toContain("transform");
  });

  it("animates nothing when reduced motion is preferred", () => {
    stubReducedMotion(true);
    renderForCSS(<ManualDrawer open onClose={vi.fn()} />);

    const css = getElementCSS("manual-panel");
    expect(css).not.toContain("animation:");
    expect(css).not.toContain("transition:transform");
  });

  it("scrolls its content pane rather than the page behind it", () => {
    stubReducedMotion(false);
    renderForCSS(<ManualDrawer open onClose={vi.fn()} />);

    expect(getElementCSS("manual-pane")).toContain("overflow-y:auto");
  });
});

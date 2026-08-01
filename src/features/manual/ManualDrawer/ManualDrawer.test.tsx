// @vitest-environment jsdom
import {
  render,
  screen,
  within,
  cleanup,
  fireEvent,
} from "@testing-library/react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { ThemeProvider, StyleSheetManager } from "styled-components";
import { theme } from "../../../tokens";
import { MANUAL_GROUPS, MANUAL_TOPICS } from "../manualContent";
import { MANUAL_TOPICS_IN_ORDER } from "../manualIndex";
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

/** The table-of-contents rail. Every topic title also appears in the pane, so
 *  rail assertions are scoped to it rather than to the whole drawer. */
function rail(): HTMLElement {
  return screen.getByRole("navigation", { name: /manual topics/i });
}

function pane(): HTMLElement {
  return screen.getByTestId("manual-pane");
}

const originalScrollIntoView = Element.prototype.scrollIntoView;

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  Element.prototype.scrollIntoView = originalScrollIntoView;
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

    expect(
      within(pane()).getByRole("heading", { name: MANUAL_TOPICS.start.title })
    ).toBeInTheDocument();
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

  it("renders every topic in the index, in order — the rail navigates, it never routes", () => {
    stubReducedMotion(false);
    renderDrawer(<ManualDrawer open onClose={vi.fn()} />);

    expect(
      within(pane())
        .getAllByRole("heading")
        .map((heading) => heading.textContent)
    ).toEqual(MANUAL_TOPICS_IN_ORDER.map((topic) => topic.title));
  });

  it("renders Getting Started's six steps as collapsible rows", () => {
    stubReducedMotion(false);
    renderDrawer(<ManualDrawer open onClose={vi.fn()} />);

    MANUAL_TOPICS.start.details.forEach((detail) => {
      expect(
        within(pane()).getByRole("button", {
          name: new RegExp(detail.heading),
        })
      ).toHaveAttribute("aria-expanded", "false");
    });
  });

  it("expands Getting Started's first step into the account kinds", () => {
    stubReducedMotion(false);
    const { container } = renderDrawer(<ManualDrawer open onClose={vi.fn()} />);
    const step = MANUAL_TOPICS.start.details[0];

    fireEvent.click(
      within(pane()).getByRole("button", { name: new RegExp(step.heading) })
    );

    const list = container.querySelector("dl");
    expect(list).not.toBeNull();
    step.terms?.forEach(({ term }) => {
      expect(within(list as HTMLElement).getByText(term)).toBeInTheDocument();
    });
  });
});

describe("ManualDrawer — the table of contents", () => {
  it("renders all five group labels in fixed order", () => {
    stubReducedMotion(false);
    renderDrawer(<ManualDrawer open onClose={vi.fn()} />);

    expect(
      screen.getAllByTestId("manual-group-label").map((el) => el.textContent)
    ).toEqual(MANUAL_GROUPS.map((group) => group.label));
  });

  it("lists every topic under its group, in index order", () => {
    stubReducedMotion(false);
    renderDrawer(<ManualDrawer open onClose={vi.fn()} />);

    expect(
      within(rail())
        .getAllByRole("button")
        .map((button) => button.textContent)
    ).toEqual(MANUAL_TOPICS_IN_ORDER.map((topic) => topic.title));
  });

  it("marks the first topic active before the reader has gone anywhere", () => {
    stubReducedMotion(false);
    renderDrawer(<ManualDrawer open onClose={vi.fn()} />);

    expect(
      within(rail()).getByRole("button", {
        name: MANUAL_TOPICS_IN_ORDER[0].title,
      })
    ).toHaveAttribute("aria-current", "true");
  });

  it("marks a clicked entry active immediately", () => {
    stubReducedMotion(false);
    renderDrawer(<ManualDrawer open onClose={vi.fn()} />);
    pane().scrollTo = vi.fn();

    const entry = within(rail()).getByRole("button", {
      name: MANUAL_TOPICS.history.title,
    });
    fireEvent.click(entry);

    expect(entry).toHaveAttribute("aria-current", "true");
  });

  it("marks exactly one entry active at a time", () => {
    stubReducedMotion(false);
    renderDrawer(<ManualDrawer open onClose={vi.fn()} />);
    pane().scrollTo = vi.fn();

    fireEvent.click(
      within(rail()).getByRole("button", { name: MANUAL_TOPICS.history.title })
    );

    const current = within(rail())
      .getAllByRole("button")
      .filter((button) => button.getAttribute("aria-current") === "true");
    expect(current).toHaveLength(1);
  });

  it("scrolls the content pane rather than the page, so the screen behind stays put", () => {
    stubReducedMotion(false);
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    renderDrawer(<ManualDrawer open onClose={vi.fn()} />);
    const scrollTo = vi.fn();
    pane().scrollTo = scrollTo;

    fireEvent.click(
      within(rail()).getByRole("button", { name: MANUAL_TOPICS.settings.title })
    );

    expect(scrollTo).toHaveBeenCalled();
    expect(scrollIntoView).not.toHaveBeenCalled();
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

    fireEvent.click(
      within(pane()).getByRole("heading", { name: MANUAL_TOPICS.start.title })
    );

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
    expect(
      within(pane()).getByRole("heading", { name: MANUAL_TOPICS.start.title })
    ).toBeInTheDocument();
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

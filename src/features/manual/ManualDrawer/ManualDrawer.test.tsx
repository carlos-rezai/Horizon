// @vitest-environment jsdom
import { useRef } from "react";
import {
  render,
  screen,
  within,
  cleanup,
  fireEvent,
  createEvent,
} from "@testing-library/react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { ThemeProvider, StyleSheetManager } from "styled-components";
import { theme } from "../../../tokens";
import { MANUAL_TOPICS } from "../manualContent";
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

function panel(): HTMLElement {
  return screen.getByTestId("manual-panel");
}

/** Everything inside the panel a keyboard can reach, in document order — the
 *  drawer's controls are all buttons, so the tab ring is exactly this list. */
function panelControls(): HTMLElement[] {
  return within(panel()).getAllByRole("button");
}

/**
 * Mirrors what AppLayout gives the drawer: a control that opens it, a fallback
 * control for when nothing in the page did (the Electron menu), and — since
 * both sit behind the backdrop — the screen a trapped Tab must never reach.
 */
function FocusHarness({ mounted, open }: { mounted: boolean; open: boolean }) {
  const fallbackRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      <button type="button">Open the manual</button>
      <button type="button" ref={fallbackRef}>
        Fallback control
      </button>
      {mounted && (
        <ManualDrawer
          open={open}
          onClose={vi.fn()}
          returnFocusRef={fallbackRef}
        />
      )}
    </>
  );
}

/**
 * Starts with the drawer already open unless a test needs to watch it arrive.
 * Closing rerenders rather than unmounting, because the caller owns mounting
 * and keeps the drawer in the tree while it animates out — which is exactly
 * when focus has to be handed back.
 */
function renderHarness({ startOpen = true } = {}) {
  const harness = (mounted: boolean, open: boolean) => (
    <ThemeProvider theme={theme}>
      <FocusHarness mounted={mounted} open={open} />
    </ThemeProvider>
  );
  const { rerender } = render(harness(startOpen, startOpen));

  return {
    openDrawer: () => rerender(harness(true, true)),
    close: () => rerender(harness(true, false)),
  };
}

function opener(): HTMLElement {
  return screen.getByRole("button", { name: "Open the manual" });
}

function fallback(): HTMLElement {
  return screen.getByRole("button", { name: "Fallback control" });
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
  it("hands the rail the whole manual, so every topic in the index has an entry", () => {
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

  it("closes on ESC", () => {
    stubReducedMotion(false);
    const onClose = vi.fn();
    renderDrawer(<ManualDrawer open onClose={onClose} />);

    fireEvent.keyDown(document, { key: "Escape" });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("ignores other keys while it is open", () => {
    stubReducedMotion(false);
    const onClose = vi.fn();
    renderDrawer(<ManualDrawer open onClose={onClose} />);

    fireEvent.keyDown(document, { key: "Enter" });

    expect(onClose).not.toHaveBeenCalled();
  });

  it("does not close on ESC once it is already closing, so the exit transition owns no keyboard", () => {
    stubReducedMotion(false);
    const onClose = vi.fn();
    renderDrawer(<ManualDrawer open={false} onClose={onClose} />);

    fireEvent.keyDown(document, { key: "Escape" });

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

describe("ManualDrawer — focus", () => {
  it("moves focus into the drawer when it opens, so a keyboard reader arrives at the manual", () => {
    stubReducedMotion(false);
    renderHarness();

    expect(panel().contains(document.activeElement)).toBe(true);
  });

  it("wraps Tab from the last control back to the first, never reaching the screen behind the backdrop", () => {
    stubReducedMotion(false);
    renderHarness();
    const controls = panelControls();
    const last = controls[controls.length - 1];
    last.focus();

    fireEvent.keyDown(last, { key: "Tab" });

    expect(document.activeElement).toBe(controls[0]);
    expect(document.activeElement).not.toBe(opener());
    expect(document.activeElement).not.toBe(fallback());
  });

  it("wraps Shift+Tab from the first control back to the last, staying inside the drawer", () => {
    stubReducedMotion(false);
    renderHarness();
    const controls = panelControls();
    const first = controls[0];
    first.focus();

    fireEvent.keyDown(first, { key: "Tab", shiftKey: true });

    expect(document.activeElement).toBe(controls[controls.length - 1]);
    expect(panel().contains(document.activeElement)).toBe(true);
  });

  it("takes over Tab only at the drawer's edges, leaving ordinary traversal to the browser", () => {
    stubReducedMotion(false);
    renderHarness();
    const controls = panelControls();
    const middle = controls[1];
    const last = controls[controls.length - 1];

    middle.focus();
    const ordinary = createEvent.keyDown(middle, { key: "Tab" });
    fireEvent(middle, ordinary);

    last.focus();
    const atEdge = createEvent.keyDown(last, { key: "Tab" });
    fireEvent(last, atEdge);

    expect(ordinary.defaultPrevented).toBe(false);
    expect(atEdge.defaultPrevented).toBe(true);
  });

  it("returns focus to the control that opened it when it closes", () => {
    stubReducedMotion(false);
    const { openDrawer, close } = renderHarness({ startOpen: false });
    opener().focus();

    openDrawer();
    // Focus really left the trigger, so the restore below is a hand-back rather
    // than focus that simply never moved.
    expect(document.activeElement).not.toBe(opener());

    close();

    // Handed back as the drawer starts closing, not when it finally unmounts —
    // a keyboard position must not wait out the exit transition.
    expect(document.activeElement).toBe(opener());
  });

  it("returns focus to the fallback control when nothing in the page opened it, rather than stranding it on body", () => {
    stubReducedMotion(false);
    // Nothing focused: what the Electron Help menu leaves behind.
    const { close } = renderHarness();

    close();

    expect(document.activeElement).toBe(fallback());
    expect(document.activeElement).not.toBe(document.body);
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

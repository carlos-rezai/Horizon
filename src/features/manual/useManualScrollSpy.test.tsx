// @vitest-environment jsdom
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import type { Mock } from "vitest";
import type { ManualTopicId } from "./manualTypes";
import { useManualScrollSpy } from "./useManualScrollSpy";

/**
 * The spy is exercised through a harness rather than `renderHook`, because its
 * whole job is reading real elements: it needs a pane to attach to and sections
 * to register. jsdom computes no layout, so the harness declares the layout
 * itself — offsets are defined on the elements and the scroll position is set
 * directly, which is the only honest way to drive a scroll observer here.
 */

const TOPIC_IDS: ManualTopicId[] = ["start", "dashboard", "streak", "settings"];

/** Section tops inside the pane, as a browser would have laid them out. */
const OFFSETS: Record<string, number> = {
  start: 0,
  dashboard: 600,
  streak: 1200,
  settings: 1800,
};

function Harness({
  topicIds = TOPIC_IDS,
  sectionIds = TOPIC_IDS,
}: {
  topicIds?: ManualTopicId[];
  /** Which sections actually made it into the tree — a rail entry can point at
   *  a section that is not rendered, and the spy has to cope. */
  sectionIds?: ManualTopicId[];
}) {
  const { activeTopicId, paneRef, registerSection, jumpTo } =
    useManualScrollSpy(topicIds);

  return (
    <div>
      <span data-testid="active">{activeTopicId}</span>
      {topicIds.map((id) => (
        <button key={id} type="button" onClick={() => jumpTo(id)}>
          jump {id}
        </button>
      ))}
      <div data-testid="pane" ref={paneRef}>
        {sectionIds.map((id) => (
          <div
            key={id}
            data-testid={`section-${id}`}
            ref={(element) => registerSection(id, element)}
          >
            {id}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Gives the registered sections the vertical positions jsdom will not. */
function layOutSections(offsets: Record<string, number> = OFFSETS) {
  Object.entries(offsets).forEach(([id, top]) => {
    Object.defineProperty(screen.getByTestId(`section-${id}`), "offsetTop", {
      value: top,
      configurable: true,
    });
  });
}

/** Scrolls the pane the way a reader's wheel would — position, then event. */
function scrollPaneTo(top: number) {
  const pane = screen.getByTestId("pane");
  Object.defineProperty(pane, "scrollTop", { value: top, configurable: true });
  fireEvent.scroll(pane);
}

function activeTopic(): string {
  return screen.getByTestId("active").textContent ?? "";
}

function jump(id: ManualTopicId) {
  fireEvent.click(screen.getByRole("button", { name: `jump ${id}` }));
}

const originalScrollIntoView = Element.prototype.scrollIntoView;
// Typed to the DOM members they stand in for, so the stubs are assignable to
// the real thing rather than to a bare `vi.fn()`'s open signature.
let scrollIntoView: Mock<Element["scrollIntoView"]>;
let paneScrollTo: Mock<(options: ScrollToOptions) => void>;

beforeEach(() => {
  scrollIntoView = vi.fn();
  Element.prototype.scrollIntoView = scrollIntoView;
});

afterEach(() => {
  cleanup();
  Element.prototype.scrollIntoView = originalScrollIntoView;
});

/** jsdom implements neither, so the pane's scroller is supplied by the test.
 *  Installed by definition rather than assignment: `scrollTo`'s two-overload
 *  DOM type admits no single-signature stub, and the options form is the only
 *  one the drawer uses. */
function stubPaneScrolling() {
  paneScrollTo = vi.fn();
  Object.defineProperty(screen.getByTestId("pane"), "scrollTo", {
    value: paneScrollTo,
    configurable: true,
  });
}

describe("useManualScrollSpy — the active topic", () => {
  it("starts on the first topic, so the rail is truthful before anyone scrolls", () => {
    render(<Harness />);

    expect(activeTopic()).toBe("start");
  });

  it("follows the pane's scroll position to whichever topic is being shown", () => {
    render(<Harness />);
    layOutSections();
    stubPaneScrolling();

    scrollPaneTo(620);

    expect(activeTopic()).toBe("dashboard");
  });

  it("keeps following as the reader scrolls further", () => {
    render(<Harness />);
    layOutSections();
    stubPaneScrolling();

    scrollPaneTo(620);
    scrollPaneTo(1850);

    expect(activeTopic()).toBe("settings");
  });

  it("returns to an earlier topic when the reader scrolls back up", () => {
    render(<Harness />);
    layOutSections();
    stubPaneScrolling();

    scrollPaneTo(1850);
    scrollPaneTo(10);

    expect(activeTopic()).toBe("start");
  });

  it("stops listening once the drawer leaves the tree", () => {
    const { unmount } = render(<Harness />);
    layOutSections();
    stubPaneScrolling();
    const pane = screen.getByTestId("pane");

    unmount();

    // A scroll on a detached pane must not reach a torn-down hook.
    expect(() => fireEvent.scroll(pane)).not.toThrow();
  });
});

describe("useManualScrollSpy — jumping to a topic", () => {
  it("marks the jumped-to topic active immediately", () => {
    render(<Harness />);
    layOutSections();
    stubPaneScrolling();

    jump("streak");

    expect(activeTopic()).toBe("streak");
  });

  it("scrolls the pane to the section's own offset", () => {
    render(<Harness />);
    layOutSections();
    stubPaneScrolling();

    jump("streak");

    expect(paneScrollTo).toHaveBeenCalledTimes(1);
    const [options] = paneScrollTo.mock.calls[0] as [ScrollToOptions];
    // Landed on the section, give or take the small breathing margin above it.
    expect(options.top).toBeLessThanOrEqual(OFFSETS.streak);
    expect(options.top).toBeGreaterThan(OFFSETS.streak - 60);
  });

  it("never uses scrollIntoView, so the page behind the drawer does not move", () => {
    render(<Harness />);
    layOutSections();
    stubPaneScrolling();

    jump("settings");

    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it("hands the highlight back to the scroll position once the reader scrolls away", () => {
    render(<Harness />);
    layOutSections();
    stubPaneScrolling();

    jump("settings");
    scrollPaneTo(620);

    expect(activeTopic()).toBe("dashboard");
  });

  it("survives a jump to a topic whose section never registered", () => {
    // The rail lists four topics; only three sections are in the tree. A dead
    // rail row must not take the drawer down with it.
    render(<Harness sectionIds={["start", "dashboard", "settings"]} />);
    stubPaneScrolling();

    expect(() => jump("streak")).not.toThrow();
    expect(activeTopic()).toBe("streak");
  });
});

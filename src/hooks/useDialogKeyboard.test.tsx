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
import { useDialogKeyboard } from "./useDialogKeyboard";

/**
 * The hook is exercised through a harness rather than `renderHook`, because its
 * whole job is moving a real keyboard around a real tree: it needs a focusable
 * surface, controls inside it to cycle between, and a page behind it that a
 * contained Tab must never reach.
 */

function Surface({
  open,
  onClose,
  returnFocusRef,
  name = "surface",
}: {
  open: boolean;
  onClose: () => void;
  returnFocusRef?: React.RefObject<HTMLElement | null>;
  /** Distinguishes the two surfaces in the stacking tests. */
  name?: string;
}) {
  const surfaceRef = useRef<HTMLDivElement>(null);

  useDialogKeyboard({ surfaceRef, open, onClose, returnFocusRef });

  return (
    <div
      ref={surfaceRef}
      role="dialog"
      aria-modal="true"
      aria-label={`${name} dialog`}
      tabIndex={-1}
      data-testid={name}
    >
      <button type="button">{name} First</button>
      <button type="button">{name} Middle</button>
      <button type="button">{name} Last</button>
    </div>
  );
}

/**
 * Mirrors what a real dialog sits in: a control that opened it, a fallback for
 * when nothing in the page did, and — since both are behind the surface — the
 * page a contained Tab must never walk onto.
 */
function Harness({
  mounted,
  open,
  onClose,
  showOpener = true,
}: {
  mounted: boolean;
  open: boolean;
  onClose: () => void;
  /** Drops the opener from the tree, so the restore target is disconnected by
   *  the time the surface closes. */
  showOpener?: boolean;
}) {
  const fallbackRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      {showOpener && <button type="button">Open the dialog</button>}
      <button type="button" ref={fallbackRef}>
        Fallback control
      </button>
      {mounted && (
        <Surface open={open} onClose={onClose} returnFocusRef={fallbackRef} />
      )}
    </>
  );
}

/**
 * Starts with the surface already open unless a test needs to watch it arrive.
 * Closing rerenders rather than unmounting, because a surface may stay in the
 * tree while it animates out — which is exactly when focus has to be handed
 * back.
 */
function renderHarness({ startOpen = true, onClose = vi.fn() } = {}) {
  const harness = (
    mounted: boolean,
    open: boolean,
    showOpener: boolean = true
  ) => (
    <Harness
      mounted={mounted}
      open={open}
      onClose={onClose}
      showOpener={showOpener}
    />
  );
  const { rerender } = render(harness(startOpen, startOpen));

  return {
    onClose,
    openSurface: () => rerender(harness(true, true)),
    close: () => rerender(harness(true, false)),
    closeWithoutOpener: () => rerender(harness(true, false, false)),
  };
}

function surface(): HTMLElement {
  return screen.getByTestId("surface");
}

/** Everything inside the surface a keyboard can reach, in document order. */
function surfaceControls(): HTMLElement[] {
  return within(surface()).getAllByRole("button");
}

function opener(): HTMLElement {
  return screen.getByRole("button", { name: "Open the dialog" });
}

function fallback(): HTMLElement {
  return screen.getByRole("button", { name: "Fallback control" });
}

afterEach(() => {
  cleanup();
});

describe("useDialogKeyboard — taking the keyboard", () => {
  it("moves focus onto the surface when it opens, so a keyboard user arrives inside the dialog", () => {
    renderHarness();

    expect(surface().contains(document.activeElement)).toBe(true);
  });

  it("leaves focus alone while the surface is closed", () => {
    const { openSurface } = renderHarness({ startOpen: false });
    opener().focus();

    expect(document.activeElement).toBe(opener());

    openSurface();

    expect(document.activeElement).not.toBe(opener());
  });
});

describe("useDialogKeyboard — containing the keyboard", () => {
  it("wraps Tab from the last control back to the first, never reaching the page behind", () => {
    renderHarness();
    const controls = surfaceControls();
    const last = controls[controls.length - 1];
    last.focus();

    fireEvent.keyDown(last, { key: "Tab" });

    expect(document.activeElement).toBe(controls[0]);
    expect(document.activeElement).not.toBe(opener());
    expect(document.activeElement).not.toBe(fallback());
  });

  it("wraps Shift+Tab from the first control back to the last, staying inside the surface", () => {
    renderHarness();
    const controls = surfaceControls();
    const first = controls[0];
    first.focus();

    fireEvent.keyDown(first, { key: "Tab", shiftKey: true });

    expect(document.activeElement).toBe(controls[controls.length - 1]);
    expect(surface().contains(document.activeElement)).toBe(true);
  });

  it("wraps Shift+Tab from the surface itself back to the last control, since the surface opens holding focus", () => {
    renderHarness();
    const controls = surfaceControls();

    fireEvent.keyDown(surface(), { key: "Tab", shiftKey: true });

    expect(document.activeElement).toBe(controls[controls.length - 1]);
  });

  it("takes over Tab only at the surface's edges, leaving ordinary traversal to the browser", () => {
    renderHarness();
    const controls = surfaceControls();
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

  it("contains nothing while the surface is closed, so a lingering exit transition does not hold the keyboard", () => {
    const { close } = renderHarness();
    const controls = surfaceControls();
    const last = controls[controls.length - 1];

    close();
    last.focus();
    const event = createEvent.keyDown(last, { key: "Tab" });
    fireEvent(last, event);

    expect(event.defaultPrevented).toBe(false);
  });
});

describe("useDialogKeyboard — closing on Escape", () => {
  it("closes on Escape from inside the surface", () => {
    const { onClose } = renderHarness();

    fireEvent.keyDown(document, { key: "Escape" });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("ignores every other key", () => {
    const { onClose } = renderHarness();

    fireEvent.keyDown(document, { key: "Enter" });
    fireEvent.keyDown(document, { key: "a" });

    expect(onClose).not.toHaveBeenCalled();
  });

  it("does not close while the surface is closed", () => {
    const { onClose, close } = renderHarness();

    close();
    onClose.mockClear();
    fireEvent.keyDown(document, { key: "Escape" });

    expect(onClose).not.toHaveBeenCalled();
  });
});

describe("useDialogKeyboard — giving the keyboard back", () => {
  it("returns focus to the control that opened it when it closes", () => {
    const { openSurface, close } = renderHarness({ startOpen: false });
    opener().focus();

    openSurface();
    // Focus really left the trigger, so the restore below is a hand-back rather
    // than focus that simply never moved.
    expect(document.activeElement).not.toBe(opener());

    close();

    expect(document.activeElement).toBe(opener());
  });

  it("returns focus to the fallback control when nothing in the page opened it, rather than stranding it on body", () => {
    // Nothing focused: what an Electron menu entry point leaves behind.
    const { close } = renderHarness();

    close();

    expect(document.activeElement).toBe(fallback());
    expect(document.activeElement).not.toBe(document.body);
  });

  it("falls back when the opener has left the document by the time the surface closes", () => {
    const { openSurface, closeWithoutOpener } = renderHarness({
      startOpen: false,
    });
    opener().focus();
    openSurface();

    closeWithoutOpener();

    expect(document.activeElement).toBe(fallback());
    expect(document.activeElement).not.toBe(document.body);
  });
});

/**
 * Two dialogs on screen at once — a menu-driven confirm landing over an open
 * feature form is the real case. Rendered directly rather than through a
 * provider, so the test is about the hook rather than about who raised what.
 */
function renderStacked({
  innerOpen = true,
  onCloseOuter = vi.fn(),
  onCloseInner = vi.fn(),
} = {}) {
  const stack = (showInner: boolean) => (
    <>
      <Surface open onClose={onCloseOuter} name="outer" />
      {showInner && <Surface open onClose={onCloseInner} name="inner" />}
    </>
  );
  const { rerender } = render(stack(innerOpen));

  return {
    onCloseOuter,
    onCloseInner,
    closeInner: () => rerender(stack(false)),
  };
}

function outerControls(): HTMLElement[] {
  return within(screen.getByTestId("outer")).getAllByRole("button");
}

function innerControls(): HTMLElement[] {
  return within(screen.getByTestId("inner")).getAllByRole("button");
}

describe("useDialogKeyboard — stacked surfaces", () => {
  it("closes only the topmost surface on Escape, so one press does not dismiss both", () => {
    const { onCloseOuter, onCloseInner } = renderStacked();

    fireEvent.keyDown(document, { key: "Escape" });

    expect(onCloseInner).toHaveBeenCalledTimes(1);
    expect(onCloseOuter).not.toHaveBeenCalled();
  });

  it("contains the keyboard in the topmost surface", () => {
    renderStacked();
    const controls = innerControls();
    const last = controls[controls.length - 1];
    last.focus();

    fireEvent.keyDown(last, { key: "Tab" });

    expect(document.activeElement).toBe(controls[0]);
  });

  it("leaves the surface underneath inert, so two traps cannot deadlock the keyboard", () => {
    renderStacked();
    const controls = outerControls();
    const last = controls[controls.length - 1];
    last.focus();

    const event = createEvent.keyDown(last, { key: "Tab" });
    fireEvent(last, event);

    // The outer trap does not fight the inner one for a key it no longer owns.
    expect(event.defaultPrevented).toBe(false);
  });

  it("hands the keyboard back to the surface underneath when the topmost one closes", () => {
    const { onCloseOuter, closeInner } = renderStacked();

    closeInner();

    const controls = outerControls();
    const last = controls[controls.length - 1];
    last.focus();
    const event = createEvent.keyDown(last, { key: "Tab" });
    fireEvent(last, event);

    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(controls[0]);

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onCloseOuter).toHaveBeenCalledTimes(1);
  });
});

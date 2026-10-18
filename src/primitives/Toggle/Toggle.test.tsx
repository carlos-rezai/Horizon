// @vitest-environment jsdom
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { ThemeProvider } from "styled-components";
import { theme } from "../../tokens";
import Toggle from "./Toggle";
import { focusOutline, outlineValue } from "../../testing/cascaded/cascaded";

afterEach(() => cleanup());

function renderToggle(props: Partial<Parameters<typeof Toggle>[0]> = {}) {
  const defaults = { checked: false, onChange: vi.fn() };
  return render(
    <ThemeProvider theme={theme}>
      <Toggle {...defaults} {...props} />
    </ThemeProvider>
  );
}

describe("Toggle", () => {
  it("renders as checked when checked prop is true", () => {
    renderToggle({ checked: true });
    expect(screen.getByRole("switch")).toBeChecked();
  });

  it("renders as unchecked when checked prop is false", () => {
    renderToggle({ checked: false });
    expect(screen.getByRole("switch")).not.toBeChecked();
  });

  it("calls onChange with true when clicked while unchecked", () => {
    const onChange = vi.fn();
    renderToggle({ checked: false, onChange });
    fireEvent.click(screen.getByRole("switch"));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("calls onChange with false when clicked while checked", () => {
    const onChange = vi.fn();
    renderToggle({ checked: true, onChange });
    fireEvent.click(screen.getByRole("switch"));
    expect(onChange).toHaveBeenCalledWith(false);
  });
});

// Issue #275, Audit Finding 33 — the Toggle carries the Button's focus ring:
// gold 2px, offset 2px.
describe("Toggle — focus ring", () => {
  it("shows the gold 2px ring, offset 2px, when focused", () => {
    renderToggle();
    const ring = focusOutline(screen.getByRole("switch"));
    expect(outlineValue(ring.outline)).toBe(
      outlineValue(`2px solid ${theme.colors.primary}`)
    );
    expect(ring.offset).toBe("2px");
  });
});

describe("Toggle — export", () => {
  it("is importable from src/primitives/index.ts", async () => {
    const { Toggle: ToggleFromIndex } = await import("../index");
    expect(() =>
      render(
        <ThemeProvider theme={theme}>
          <ToggleFromIndex checked={false} onChange={vi.fn()} />
        </ThemeProvider>
      )
    ).not.toThrow();
  });
});

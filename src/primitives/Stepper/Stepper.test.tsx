// @vitest-environment jsdom
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { ThemeProvider } from "styled-components";
import { theme } from "../../tokens";
import Stepper from "./Stepper";
import { cascaded, computedColor } from "../../testing/cascaded/cascaded";

afterEach(() => cleanup());

function renderStepper(props: Partial<Parameters<typeof Stepper>[0]> = {}) {
  const defaults = { value: 5, onChange: vi.fn(), "aria-label": "Day" };
  return render(
    <ThemeProvider theme={theme}>
      <Stepper {...defaults} {...props} />
    </ThemeProvider>
  );
}

describe("Stepper — display", () => {
  it("displays the current value", () => {
    renderStepper({ value: 15 });
    expect(screen.getByText("15")).toBeInTheDocument();
  });
});

describe("Stepper — increment", () => {
  it("calls onChange with value + 1 when increment is clicked (default step)", () => {
    const onChange = vi.fn();
    renderStepper({ value: 10, onChange });
    fireEvent.click(screen.getByRole("button", { name: /increment/i }));
    expect(onChange).toHaveBeenCalledWith(11);
  });

  it("calls onChange with value + step when a custom step is provided", () => {
    const onChange = vi.fn();
    renderStepper({ value: 10, onChange, step: 5 });
    fireEvent.click(screen.getByRole("button", { name: /increment/i }));
    expect(onChange).toHaveBeenCalledWith(15);
  });

  it("clamps to max when incrementing at the upper boundary", () => {
    const onChange = vi.fn();
    renderStepper({ value: 31, onChange, max: 31 });
    fireEvent.click(screen.getByRole("button", { name: /increment/i }));
    expect(onChange).toHaveBeenCalledWith(31);
  });
});

describe("Stepper — decrement", () => {
  it("calls onChange with value - 1 when decrement is clicked (default step)", () => {
    const onChange = vi.fn();
    renderStepper({ value: 10, onChange });
    fireEvent.click(screen.getByRole("button", { name: /decrement/i }));
    expect(onChange).toHaveBeenCalledWith(9);
  });

  it("calls onChange with value - step when a custom step is provided", () => {
    const onChange = vi.fn();
    renderStepper({ value: 10, onChange, step: 5 });
    fireEvent.click(screen.getByRole("button", { name: /decrement/i }));
    expect(onChange).toHaveBeenCalledWith(5);
  });

  it("clamps to min when decrementing at the lower boundary", () => {
    const onChange = vi.fn();
    renderStepper({ value: 1, onChange, min: 1 });
    fireEvent.click(screen.getByRole("button", { name: /decrement/i }));
    expect(onChange).toHaveBeenCalledWith(1);
  });
});

// Issue #275, Audit Finding 3 — the Stepper sits at Control Height md and
// wears the field look (Field Chrome), so it lines up with the fields
// stacked above and below it.
describe("Stepper — Control Height and Field Chrome", () => {
  function box(): HTMLElement {
    renderStepper();
    return screen.getByRole("button", { name: /decrement/i })
      .parentElement as HTMLElement;
  }

  it("renders its box at the md Control Height", () => {
    expect(getComputedStyle(box()).height).toBe(`${theme.sizing.control.md}px`);
  });

  it("renders its box with the Field Chrome background, border and radius", () => {
    const el = box();
    const style = getComputedStyle(el);
    expect(style.backgroundColor).toBe(
      computedColor(theme.colors.surfaceContainerLowest)
    );
    expect(
      `${style.borderTopWidth} ${style.borderTopStyle} ${style.borderTopColor}`
    ).toBe(`1px solid ${computedColor(theme.colors.outlineVariant)}`);
    expect(cascaded(el, "border-radius")).toBe(`${theme.radius.md}px`);
  });
});

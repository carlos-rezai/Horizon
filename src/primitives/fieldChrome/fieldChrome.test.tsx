// @vitest-environment jsdom
import { render, screen, cleanup, act } from "@testing-library/react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { ThemeProvider } from "styled-components";
import { theme } from "../../tokens";
import Input from "../Input/Input";
import Select from "../Select/Select";
import DatePicker from "../DatePicker/DatePicker";
import { cascaded, computedColor } from "../../testing/cascaded/cascaded";

// Issue #269 — Field Chrome. The text field, the dropdown and the date field
// wear one chrome: the same background, border, radius and height at rest,
// the same gold border and 3px gold-wash ring when focused, and the same
// 0.4 opacity when disabled. Pinned through what each field renders, never
// through the fragment itself.

afterEach(() => cleanup());

function renderFields({ disabled = false }: { disabled?: boolean } = {}) {
  render(
    <ThemeProvider theme={theme}>
      <Input aria-label="Amount" disabled={disabled} />
      <Select aria-label="Account kind" disabled={disabled}>
        <option value="Girokonto">Girokonto</option>
      </Select>
      <DatePicker
        value="2024-01-15"
        onChange={vi.fn()}
        aria-label="Date"
        disabled={disabled}
      />
    </ThemeProvider>
  );

  return [
    screen.getByRole("textbox", { name: "Amount" }),
    screen.getByRole("combobox", { name: "Account kind" }),
    screen.getByLabelText("Date"),
  ];
}

/**
 * jsdom caches computed styles and only drops the cache on a DOM mutation,
 * not on a focus change, so a harmless mutation makes the next read see the
 * :focus-visible rules.
 */
function freshStyle(el: HTMLElement): CSSStyleDeclaration {
  const marker = document.createElement("i");
  document.body.appendChild(marker);
  marker.remove();
  return getComputedStyle(el);
}

function focusRing(el: HTMLElement) {
  act(() => el.focus());
  const style = freshStyle(el);
  return {
    borderColor: style.borderTopColor,
    boxShadow: style.boxShadow,
    outline: cascaded(el, "outline"),
  };
}

describe("Field Chrome — at rest", () => {
  it("Input, Select and DatePicker render the lowest-ink background", () => {
    const backgrounds = renderFields().map(
      (el) => getComputedStyle(el).backgroundColor
    );
    expect(backgrounds).toEqual(
      Array(3).fill(computedColor(theme.colors.surfaceContainerLowest))
    );
  });

  it("Input, Select and DatePicker render the same outline-variant border", () => {
    const borders = renderFields().map((el) => {
      const style = getComputedStyle(el);
      return `${style.borderTopWidth} ${style.borderTopStyle} ${style.borderTopColor}`;
    });
    expect(borders).toEqual(
      Array(3).fill(`1px solid ${computedColor(theme.colors.outlineVariant)}`)
    );
  });

  it("Input, Select and DatePicker render the medium radius", () => {
    const radii = renderFields().map((el) => cascaded(el, "border-radius"));
    expect(radii).toEqual(Array(3).fill(`${theme.radius.md}px`));
  });

  it("Input, Select and DatePicker render the md Control Height", () => {
    const heights = renderFields().map((el) => getComputedStyle(el).height);
    expect(heights).toEqual(Array(3).fill(`${theme.sizing.control.md}px`));
  });
});

describe("Field Chrome — focused", () => {
  it("each field shows a gold border when focused", () => {
    const rings = renderFields().map((el) => focusRing(el).borderColor);
    expect(rings).toEqual(Array(3).fill(computedColor(theme.colors.primary)));
  });

  it("each field shows a 3px gold-wash ring when focused", () => {
    const rings = renderFields().map((el) => focusRing(el).boxShadow);
    rings.forEach((ring) => {
      expect(ring).toMatch(/0(px)? 0(px)? 0(px)? 3px/);
      expect(ring.replace(/\s/g, "")).toContain(
        theme.colors.primaryContainer.replace(/\s/g, "")
      );
    });
  });

  it("all three fields show the identical focus ring", () => {
    const rings = renderFields().map(focusRing);
    expect(rings[1]).toEqual(rings[0]);
    expect(rings[2]).toEqual(rings[0]);
  });

  it("no field draws an offset outline as its focus ring", () => {
    const outlines = renderFields().map((el) => focusRing(el).outline);
    expect(outlines).toEqual(Array(3).fill("none"));
  });
});

describe("Field Chrome — disabled", () => {
  it("Input, Select and DatePicker render at 0.4 opacity when disabled", () => {
    const opacities = renderFields({ disabled: true }).map(
      (el) => getComputedStyle(el).opacity
    );
    expect(opacities).toEqual(Array(3).fill("0.4"));
  });
});

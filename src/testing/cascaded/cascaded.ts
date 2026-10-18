import { act, fireEvent } from "@testing-library/react";

/**
 * Test support for reading styled-components output in jsdom.
 *
 * jsdom does not compute `border-radius`, `outline` or `outline-offset`, so
 * those are read as the cascade would resolve them: the last declaration among
 * the style rules that match the element in its current state.
 */
export function cascaded(el: Element, property: string): string {
  let declared = "";
  Array.from(document.styleSheets).forEach((sheet) => {
    Array.from(sheet.cssRules).forEach((rule) => {
      if (!(rule instanceof CSSStyleRule)) return;
      let matches = false;
      try {
        matches = el.matches(rule.selectorText);
      } catch {
        // A selector jsdom cannot parse (e.g. a vendor pseudo) never matches.
      }
      if (!matches) return;
      const value = rule.style.getPropertyValue(property);
      if (value) declared = value;
    });
  });
  return declared;
}

/** A colour as jsdom serialises it, so token hex and rgba compare equal. */
export function computedColor(value: string): string {
  const probe = document.createElement("span");
  probe.style.color = value;
  document.body.appendChild(probe);
  const color = getComputedStyle(probe).color;
  probe.remove();
  return color;
}

/**
 * Focuses the element and returns its cascaded outline. jsdom caches computed
 * styles until a DOM mutation, so a harmless mutation follows the focus.
 */
export function focusOutline(el: HTMLElement): {
  outline: string;
  offset: string;
} {
  // Keyboard modality first, so :focus-visible matches as it would on Tab.
  fireEvent.keyDown(document.body, { key: "Tab" });
  act(() => el.focus());
  const marker = document.createElement("i");
  document.body.appendChild(marker);
  marker.remove();
  return {
    outline: cascaded(el, "outline"),
    offset: cascaded(el, "outline-offset"),
  };
}

/** An outline value as jsdom serialises it, so declared and expected compare. */
export function outlineValue(value: string): string {
  const probe = document.createElement("span");
  probe.style.outline = value;
  return probe.style.outline || value;
}

// @vitest-environment jsdom
import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { ThemeProvider } from "styled-components";
import { theme } from "../tokens";
import Button from "./Button/Button";
import Input from "./Input/Input";
import Select from "./Select/Select";
import DatePicker from "./DatePicker/DatePicker";

// Issue #268 — Control Height. One size means one height: a Button, an
// Input, a Select and a DatePicker of the same size line up side by side,
// and none of them keeps its own height table or a literal height — the
// height comes from the `sizing.control` token.

afterEach(() => cleanup());

const sizes = ["sm", "md", "lg"] as const;

describe("Control Height — parity across control primitives", () => {
  sizes.forEach((size) => {
    it(`a Button, Input, Select and DatePicker of size "${size}" render the same height`, () => {
      render(
        <ThemeProvider theme={theme}>
          <Button size={size}>Save</Button>
          <Input aria-label="Amount" size={size} />
          <Select aria-label="Account kind" size={size}>
            <option value="Girokonto">Girokonto</option>
          </Select>
          <DatePicker
            value="2024-01-15"
            onChange={vi.fn()}
            aria-label="Date"
            size={size}
          />
        </ThemeProvider>
      );

      const heights = [
        screen.getByRole("button", { name: "Save" }),
        screen.getByRole("textbox", { name: "Amount" }),
        screen.getByRole("combobox", { name: "Account kind" }),
        screen.getByLabelText("Date"),
      ].map((el) => getComputedStyle(el).height);

      expect(heights).toEqual(Array(4).fill(`${theme.sizing.control[size]}px`));
    });
  });
});

// The styles source of each control primitive, read raw (as the font-faces
// test reads main.tsx), so the guard sees what the author wrote.
const controlStyles = import.meta.glob(
  [
    "./Button/Button.styles.ts",
    "./Input/Input.styles.ts",
    "./Select/Select.styles.ts",
    "./DatePicker/DatePicker.styles.ts",
  ],
  { query: "?raw", import: "default", eager: true }
) as Record<string, string>;

describe("Control Height — no local height in control primitives", () => {
  it("reads all four control primitive style modules", () => {
    expect(Object.keys(controlStyles)).toHaveLength(4);
  });

  Object.entries(controlStyles).forEach(([path, source]) => {
    it(`${path} declares its height from the sizing.control token`, () => {
      expect(source).toMatch(/sizing\.control/);
    });

    it(`${path} keeps no literal height`, () => {
      expect(source).not.toMatch(/(?<![-\w])(min-|max-)?height:\s*\d/);
    });

    it(`${path} keeps no local height table`, () => {
      expect(source).not.toMatch(/Record<\s*Size\s*,\s*number\s*>/);
      expect(source).not.toMatch(/\b\w*[Hh]eights?\s*(:\s*[^=]+)?=\s*\{/);
    });
  });
});

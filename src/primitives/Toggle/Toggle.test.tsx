// @vitest-environment jsdom
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { ThemeProvider } from "styled-components";
import { theme } from "../../tokens";
import Toggle from "./Toggle";

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

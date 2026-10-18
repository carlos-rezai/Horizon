// @vitest-environment jsdom
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { ThemeProvider } from "styled-components";
import { theme } from "../../tokens";
import ChoiceChip from "./ChoiceChip";
import Button from "../Button/Button";
import { focusOutline, outlineValue } from "../../testing/cascaded/cascaded";

afterEach(cleanup);

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
}

describe("ChoiceChip", () => {
  it("renders its label and reflects the active state via aria-pressed", () => {
    renderWithTheme(<ChoiceChip label="Outflow" active />);
    const chip = screen.getByRole("button", { name: "Outflow" });
    expect(chip).toHaveAttribute("aria-pressed", "true");
  });

  it("fires onClick when pressed", () => {
    const onClick = vi.fn();
    renderWithTheme(<ChoiceChip label="Inflow" onClick={onClick} />);
    fireEvent.click(screen.getByRole("button", { name: "Inflow" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("does not fire onClick when disabled", () => {
    const onClick = vi.fn();
    renderWithTheme(<ChoiceChip label="Dining" disabled onClick={onClick} />);
    fireEvent.click(screen.getByRole("button", { name: "Dining" }));
    expect(onClick).not.toHaveBeenCalled();
  });
});

// Issue #275, Audit Finding 4 — the segmented and toggle chips (Saved/Spent,
// Mode, Direction, Category and the Import account chips) are all the
// ChoiceChip, and the ChoiceChip sits at Control Height sm.
describe("ChoiceChip — Control Height", () => {
  it("renders at the sm Control Height", () => {
    renderWithTheme(<ChoiceChip label="Saved" active />);
    expect(
      getComputedStyle(screen.getByRole("button", { name: "Saved" })).height
    ).toBe(`${theme.sizing.control.sm}px`);
  });
});

// Issue #275, Audit Finding 32 — chips carry the Button's focus ring.
describe("ChoiceChip — focus ring", () => {
  it("shows the same ring as the Button when focused", () => {
    renderWithTheme(
      <>
        <ChoiceChip label="Spent" />
        <Button variant="ghost">Reference</Button>
      </>
    );
    const button = focusOutline(
      screen.getByRole("button", { name: "Reference" })
    );
    const chip = focusOutline(screen.getByRole("button", { name: "Spent" }));
    expect(outlineValue(button.outline)).toBe(
      outlineValue(`2px solid ${theme.colors.primary}`)
    );
    expect(chip).toEqual(button);
  });
});

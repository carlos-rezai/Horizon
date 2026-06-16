// @vitest-environment jsdom
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { ThemeProvider } from "styled-components";
import { theme } from "../../tokens";
import ChoiceChip from "./ChoiceChip";

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

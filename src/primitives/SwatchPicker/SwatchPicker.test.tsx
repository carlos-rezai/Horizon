// @vitest-environment jsdom
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { ThemeProvider } from "styled-components";
import { theme } from "../../tokens";
import SwatchPicker from "./SwatchPicker";

afterEach(cleanup);

const PALETTE = ["#AA0000", "#00BB00", "#0000CC"] as const;

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
}

describe("SwatchPicker", () => {
  it("renders one selectable button per supplied swatch", () => {
    renderWithTheme(
      <SwatchPicker palette={PALETTE} value={PALETTE[0]} onChange={vi.fn()} />
    );
    for (const hex of PALETTE) {
      expect(screen.getByRole("button", { name: hex })).toBeInTheDocument();
    }
  });

  it("marks the selected swatch via aria-pressed, case-insensitively", () => {
    renderWithTheme(
      <SwatchPicker palette={PALETTE} value="#00bb00" onChange={vi.fn()} />
    );
    expect(screen.getByRole("button", { name: "#00BB00" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(screen.getByRole("button", { name: "#AA0000" })).toHaveAttribute(
      "aria-pressed",
      "false"
    );
  });

  it("reports the chosen hex on click", () => {
    const onChange = vi.fn();
    renderWithTheme(
      <SwatchPicker palette={PALETTE} value={PALETTE[0]} onChange={onChange} />
    );
    fireEvent.click(screen.getByRole("button", { name: "#0000CC" }));
    expect(onChange).toHaveBeenCalledWith("#0000CC");
  });
});

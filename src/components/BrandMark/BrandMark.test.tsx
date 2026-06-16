// @vitest-environment jsdom
import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import { ThemeProvider } from "styled-components";
import { theme } from "../../tokens";
import BrandMark from "./BrandMark";

afterEach(cleanup);

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
}

describe("BrandMark", () => {
  it("exposes an accessible image when given a label", () => {
    renderWithTheme(<BrandMark label="Horizon" />);
    expect(screen.getByRole("img", { name: /horizon/i })).toBeInTheDocument();
  });

  it("is decorative (no img role) when no label is given", () => {
    renderWithTheme(<BrandMark />);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});

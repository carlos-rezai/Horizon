// @vitest-environment jsdom
import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import { ThemeProvider } from "styled-components";
import { theme } from "../../tokens";
import Card from "./Card";

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
}

afterEach(() => {
  cleanup();
});

describe("Card — unit", () => {
  it("renders children inside a surface container", () => {
    renderWithTheme(<Card>Account summary</Card>);
    expect(screen.getByText("Account summary")).toBeInTheDocument();
  });
});

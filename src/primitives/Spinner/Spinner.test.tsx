// @vitest-environment jsdom
import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import { ThemeProvider } from "styled-components";
import { theme } from "../../tokens";
import Spinner from "./Spinner";

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
}

afterEach(() => {
  cleanup();
});

describe("Spinner — unit", () => {
  it("renders with aria-label='Loading' when no size is supplied", () => {
    renderWithTheme(<Spinner />);
    expect(screen.getByLabelText("Loading")).toBeInTheDocument();
  });

  it("renders with aria-label='Loading' for size small", () => {
    renderWithTheme(<Spinner size="small" />);
    expect(screen.getByLabelText("Loading")).toBeInTheDocument();
  });

  it("renders with aria-label='Loading' for size medium", () => {
    renderWithTheme(<Spinner size="medium" />);
    expect(screen.getByLabelText("Loading")).toBeInTheDocument();
  });

  it("renders with aria-label='Loading' for size large", () => {
    renderWithTheme(<Spinner size="large" />);
    expect(screen.getByLabelText("Loading")).toBeInTheDocument();
  });
});

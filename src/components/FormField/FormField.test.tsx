// @vitest-environment jsdom
import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import { ThemeProvider } from "styled-components";
import { theme } from "../../tokens";
import FormField from "./FormField";
import Input from "../../primitives/Input/Input";

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
}

afterEach(() => {
  cleanup();
});

describe("FormField — unit", () => {
  it("renders the label text", () => {
    renderWithTheme(
      <FormField label="Account name">
        <Input aria-label="Account name" />
      </FormField>
    );
    expect(screen.getByText("Account name")).toBeInTheDocument();
  });

  it("renders the error message when the error prop is provided", () => {
    renderWithTheme(
      <FormField label="Amount" error="Amount is required">
        <Input aria-label="Amount" />
      </FormField>
    );
    expect(screen.getByText("Amount is required")).toBeInTheDocument();
  });

  it("renders no error element when the error prop is absent", () => {
    renderWithTheme(
      <FormField label="Amount">
        <Input aria-label="Amount" />
      </FormField>
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("renders a hint when one is provided", () => {
    renderWithTheme(
      <FormField label="Amount" hint="in euros">
        <Input aria-label="Amount" />
      </FormField>
    );
    expect(screen.getByText("in euros")).toBeInTheDocument();
  });

  it("does not render a hint when none is provided", () => {
    renderWithTheme(
      <FormField label="Amount">
        <Input aria-label="Amount" />
      </FormField>
    );
    expect(screen.queryByText("in euros")).not.toBeInTheDocument();
  });

  it("renders the hint above the error", () => {
    renderWithTheme(
      <FormField label="Amount" hint="in euros" error="Amount is required">
        <Input aria-label="Amount" />
      </FormField>
    );
    const hint = screen.getByText("in euros");
    const error = screen.getByRole("alert");
    expect(
      hint.compareDocumentPosition(error) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });
});

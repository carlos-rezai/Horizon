// @vitest-environment jsdom
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { ThemeProvider } from "styled-components";
import { theme } from "../../tokens";
import Snackbar from "./Snackbar";

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
}

afterEach(() => {
  cleanup();
});

describe("Snackbar", () => {
  it("renders the message text", () => {
    renderWithTheme(
      <Snackbar message="Update ready" variant="success" onClose={vi.fn()} />
    );
    expect(screen.getByText("Update ready")).toBeInTheDocument();
  });

  it("calls onClose when the close button is clicked", () => {
    const onClose = vi.fn();
    renderWithTheme(
      <Snackbar message="Update ready" variant="success" onClose={onClose} />
    );
    fireEvent.click(screen.getByRole("button", { name: /close/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls action.onClick when the action button is clicked", () => {
    const onAction = vi.fn();
    renderWithTheme(
      <Snackbar
        message="Update ready"
        variant="success"
        onClose={vi.fn()}
        action={{ label: "Restart to update", onClick: onAction }}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Restart to update" }));
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it("omits the action button when no action prop is provided", () => {
    renderWithTheme(
      <Snackbar message="Info message" variant="info" onClose={vi.fn()} />
    );
    expect(screen.getAllByRole("button")).toHaveLength(1);
  });
});

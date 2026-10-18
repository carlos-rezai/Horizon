// @vitest-environment jsdom
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { ThemeProvider } from "styled-components";
import { theme } from "../../tokens";
import Snackbar from "./Snackbar";
import Button from "../../primitives/Button/Button";

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

/**
 * A reference Button in ghost, small, icon-only form. Matching its generated
 * classes proves a control is that Button — one Control Height sm, one hover,
 * one focus ring — rather than a hand-sized look-alike.
 */
function referenceIconButtonClass(): string {
  const { getByRole, unmount } = render(
    <ThemeProvider theme={theme}>
      <Button variant="ghost" size="sm" icon="X" aria-label="Reference" />
    </ThemeProvider>
  );
  const className = getByRole("button", { name: "Reference" }).className;
  unmount();
  return className;
}

// Issue #272 — feature icon buttons onto Button.
describe("Snackbar — close is the shared icon button", () => {
  it("is the ghost, small, icon-only Button, keeping its name and handler", () => {
    const onClose = vi.fn();
    renderWithTheme(
      <Snackbar message="Update ready" variant="success" onClose={onClose} />
    );
    const close = screen.getByRole("button", { name: "close" });

    expect(close.className).toBe(referenceIconButtonClass());
    expect(close.querySelector("svg")).toBeInTheDocument();
    expect(close.textContent).toBe("");

    fireEvent.click(close);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

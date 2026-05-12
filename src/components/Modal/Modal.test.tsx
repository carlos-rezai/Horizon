// @vitest-environment jsdom
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { ThemeProvider, StyleSheetManager } from "styled-components";
import { theme } from "../../tokens";
import Modal from "./Modal";

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
}

afterEach(() => {
  cleanup();
});

describe("Modal — unit", () => {
  it("renders with role='dialog' and aria-modal='true'", () => {
    renderWithTheme(
      <Modal onClose={vi.fn()}>
        <p>Content</p>
      </Modal>
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute("aria-modal", "true");
  });

  it("renders its children as dialog content", () => {
    renderWithTheme(
      <Modal onClose={vi.fn()}>
        <p>Dialog content</p>
      </Modal>
    );
    expect(screen.getByText("Dialog content")).toBeInTheDocument();
  });
});

describe("Modal — interaction", () => {
  it("calls onClose when the overlay is clicked", () => {
    const onClose = vi.fn();
    renderWithTheme(
      <Modal onClose={onClose}>
        <p>Content</p>
      </Modal>
    );
    fireEvent.click(screen.getByTestId("modal-overlay"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not call onClose when the dialog content area is clicked", () => {
    const onClose = vi.fn();
    renderWithTheme(
      <Modal onClose={onClose}>
        <p>Content</p>
      </Modal>
    );
    fireEvent.click(screen.getByRole("dialog"));
    expect(onClose).not.toHaveBeenCalled();
  });
});

function renderForCSS(ui: React.ReactElement) {
  return render(
    <StyleSheetManager disableCSSOMInjection>
      <ThemeProvider theme={theme}>{ui}</ThemeProvider>
    </StyleSheetManager>
  );
}

function getInjectedCSS(): string {
  return Array.from(document.querySelectorAll("style"))
    .map((el) => el.textContent ?? "")
    .join("\n");
}

describe("Modal — styles", () => {
  it("dialog is elevated above card surfaces with a drop shadow", () => {
    renderForCSS(
      <Modal onClose={vi.fn()}>
        <p>Content</p>
      </Modal>
    );
    expect(getInjectedCSS()).toContain("box-shadow");
  });
});

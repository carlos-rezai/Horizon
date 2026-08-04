// @vitest-environment jsdom
import {
  render,
  screen,
  within,
  cleanup,
  fireEvent,
} from "@testing-library/react";
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

/**
 * A dialog with the page it was opened from still behind it: `aria-modal="true"`
 * promises the keyboard never reaches that page, and these are the tests that
 * hold the promise. Closing unmounts the dialog, which is how every consumer
 * renders it.
 */
function renderDialogOverPage({ onClose = vi.fn(), open = true } = {}) {
  const page = (isOpen: boolean) => (
    <ThemeProvider theme={theme}>
      <button type="button">Open the dialog</button>
      {isOpen && (
        <Modal onClose={onClose} title="Edit account">
          <button type="button">First field</button>
          <button type="button">Second field</button>
        </Modal>
      )}
    </ThemeProvider>
  );
  const { rerender } = render(page(open));

  return {
    onClose,
    openDialog: () => rerender(page(true)),
    close: () => rerender(page(false)),
  };
}

function dialog(): HTMLElement {
  return screen.getByRole("dialog");
}

/** Everything inside the dialog a keyboard can reach, in document order. */
function dialogControls(): HTMLElement[] {
  return within(dialog()).getAllByRole("button");
}

function pageOpener(): HTMLElement {
  return screen.getByRole("button", { name: "Open the dialog" });
}

describe("Modal — keyboard", () => {
  it("moves focus into the dialog when it opens", () => {
    renderDialogOverPage();

    expect(dialog().contains(document.activeElement)).toBe(true);
  });

  it("wraps Tab from the last control back to the first, never reaching the page behind", () => {
    renderDialogOverPage();
    const controls = dialogControls();
    const last = controls[controls.length - 1];
    last.focus();

    fireEvent.keyDown(last, { key: "Tab" });

    expect(document.activeElement).toBe(controls[0]);
    expect(document.activeElement).not.toBe(pageOpener());
  });

  it("wraps Shift+Tab from the first control back to the last, staying inside the dialog", () => {
    renderDialogOverPage();
    const controls = dialogControls();
    const first = controls[0];
    first.focus();

    fireEvent.keyDown(first, { key: "Tab", shiftKey: true });

    expect(document.activeElement).toBe(controls[controls.length - 1]);
    expect(dialog().contains(document.activeElement)).toBe(true);
  });

  it("calls onClose on Escape", () => {
    const { onClose } = renderDialogOverPage();

    fireEvent.keyDown(document, { key: "Escape" });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("returns focus to the control that opened it when it closes", () => {
    const { openDialog, close } = renderDialogOverPage({ open: false });
    pageOpener().focus();

    openDialog();
    expect(document.activeElement).not.toBe(pageOpener());

    close();

    expect(document.activeElement).toBe(pageOpener());
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

describe("Modal — header slot", () => {
  it("renders a title in the header when one is provided", () => {
    renderWithTheme(
      <Modal onClose={vi.fn()} title="Edit account">
        <p>Content</p>
      </Modal>
    );
    expect(screen.getByText("Edit account")).toBeInTheDocument();
  });

  it("renders a close button in the header that calls onClose", () => {
    const onClose = vi.fn();
    renderWithTheme(
      <Modal onClose={onClose} title="Edit account">
        <p>Content</p>
      </Modal>
    );
    fireEvent.click(screen.getByTestId("modal-close"));
    expect(onClose).toHaveBeenCalled();
  });

  it("renders no header close button when no title is given", () => {
    renderWithTheme(
      <Modal onClose={vi.fn()}>
        <p>Content</p>
      </Modal>
    );
    expect(screen.queryByTestId("modal-close")).not.toBeInTheDocument();
  });
});

describe("Modal — footer slot", () => {
  it("renders footer content when a footer is provided", () => {
    renderWithTheme(
      <Modal onClose={vi.fn()} footer={<button>Save</button>}>
        <p>Content</p>
      </Modal>
    );
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });
});

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

// @vitest-environment jsdom
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { ThemeProvider } from "styled-components";
import { theme } from "../../tokens";
import ConfirmModal from "./ConfirmModal";

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
}

afterEach(() => {
  cleanup();
});

describe("ConfirmModal — render", () => {
  it("renders the title, message, and default confirm/cancel buttons", () => {
    renderWithTheme(
      <ConfirmModal
        title="Start Fresh"
        message="Erase all Horizon data?"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByText("Start Fresh")).toBeInTheDocument();
    expect(screen.getByText("Erase all Horizon data?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirm" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  it("renders custom confirm/cancel labels and the detail line", () => {
    renderWithTheme(
      <ConfirmModal
        title="Start Fresh"
        message="Erase everything?"
        detail="This cannot be undone."
        confirmLabel="Erase everything"
        cancelLabel="Keep my data"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(
      screen.getByRole("button", { name: "Erase everything" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Keep my data" })
    ).toBeInTheDocument();
    expect(screen.getByText("This cannot be undone.")).toBeInTheDocument();
  });
});

describe("ConfirmModal — tone", () => {
  it("defaults to the default tone", () => {
    renderWithTheme(
      <ConfirmModal
        title="Proceed?"
        message="Neutral confirm."
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByText("Neutral confirm.")).toHaveAttribute(
      "data-tone",
      "default"
    );
  });

  it("applies the danger tone", () => {
    renderWithTheme(
      <ConfirmModal
        title="Start Fresh"
        message="Destructive confirm."
        tone="danger"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByText("Destructive confirm.")).toHaveAttribute(
      "data-tone",
      "danger"
    );
  });
});

describe("ConfirmModal — callbacks", () => {
  it("calls onConfirm when the confirm button is clicked", () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    renderWithTheme(
      <ConfirmModal
        title="Proceed?"
        message="Go?"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("calls onCancel when the cancel button is clicked", () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    renderWithTheme(
      <ConfirmModal
        title="Proceed?"
        message="Go?"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("treats dismissing via the header close as a cancel", () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    renderWithTheme(
      <ConfirmModal
        title="Proceed?"
        message="Go?"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );
    fireEvent.click(screen.getByTestId("modal-close"));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("treats an overlay click as a cancel", () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    renderWithTheme(
      <ConfirmModal
        title="Proceed?"
        message="Go?"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );
    fireEvent.click(screen.getByTestId("modal-overlay"));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });
});

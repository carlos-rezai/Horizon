// @vitest-environment jsdom
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { ThemeProvider } from "styled-components";
import { theme } from "../../tokens";
import AlertModal from "./AlertModal";

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
}

afterEach(() => {
  cleanup();
});

describe("AlertModal — render", () => {
  it("renders the title, message, and OK button", () => {
    renderWithTheme(
      <AlertModal
        title="Backup failed"
        message="Horizon could not create the backup."
        onClose={vi.fn()}
      />
    );
    expect(screen.getByText("Backup failed")).toBeInTheDocument();
    expect(
      screen.getByText("Horizon could not create the backup.")
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "OK" })).toBeInTheDocument();
  });

  it("renders the optional detail line when provided", () => {
    renderWithTheme(
      <AlertModal
        title="Backup failed"
        message="Something went wrong."
        detail="EACCES: permission denied"
        onClose={vi.fn()}
      />
    );
    expect(screen.getByText("EACCES: permission denied")).toBeInTheDocument();
  });

  it("omits the detail line when none is given", () => {
    renderWithTheme(
      <AlertModal title="Done" message="All good." onClose={vi.fn()} />
    );
    expect(screen.queryByText("EACCES: permission denied")).toBeNull();
  });

  it("uses a custom OK label when provided", () => {
    renderWithTheme(
      <AlertModal
        title="Heads up"
        message="Read this."
        okLabel="Got it"
        onClose={vi.fn()}
      />
    );
    expect(screen.getByRole("button", { name: "Got it" })).toBeInTheDocument();
  });
});

describe("AlertModal — tone", () => {
  it("defaults to the info tone", () => {
    renderWithTheme(
      <AlertModal title="FYI" message="Neutral message." onClose={vi.fn()} />
    );
    expect(screen.getByText("Neutral message.")).toHaveAttribute(
      "data-tone",
      "info"
    );
  });

  it("applies the requested tone", () => {
    renderWithTheme(
      <AlertModal
        title="Backup failed"
        message="It broke."
        tone="error"
        onClose={vi.fn()}
      />
    );
    expect(screen.getByText("It broke.")).toHaveAttribute("data-tone", "error");
  });
});

describe("AlertModal — acknowledge", () => {
  it("calls onClose when the OK button is clicked", () => {
    const onClose = vi.fn();
    renderWithTheme(
      <AlertModal title="Done" message="All good." onClose={onClose} />
    );
    fireEvent.click(screen.getByRole("button", { name: "OK" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when the header close button is clicked", () => {
    const onClose = vi.fn();
    renderWithTheme(
      <AlertModal title="Done" message="All good." onClose={onClose} />
    );
    fireEvent.click(screen.getByTestId("modal-close"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

// @vitest-environment jsdom
import {
  render,
  screen,
  cleanup,
  fireEvent,
  act,
  renderHook,
} from "@testing-library/react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { ThemeProvider } from "styled-components";
import { theme } from "../../tokens";
import ConfirmProvider from "./ConfirmProvider";
import { useConfirm, type ConfirmFn } from "./useConfirm";

let confirm: ConfirmFn;

// Captures the confirm function so tests can drive the provider imperatively.
function Capture() {
  confirm = useConfirm();
  return null;
}

function renderProvider() {
  return render(
    <ThemeProvider theme={theme}>
      <ConfirmProvider>
        <Capture />
      </ConfirmProvider>
    </ThemeProvider>
  );
}

afterEach(() => {
  cleanup();
});

describe("ConfirmProvider / confirm", () => {
  it("shows nothing until confirm is called", () => {
    renderProvider();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("shows a ConfirmModal with the given title and message", () => {
    renderProvider();
    act(() => {
      void confirm({ title: "Start Fresh", message: "Erase everything?" });
    });
    expect(screen.getByText("Start Fresh")).toBeInTheDocument();
    expect(screen.getByText("Erase everything?")).toBeInTheDocument();
  });

  it("resolves true and closes when confirmed", async () => {
    renderProvider();
    let promise!: Promise<boolean>;
    act(() => {
      promise = confirm({ title: "Proceed?", message: "Go?" });
    });
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    });
    await expect(promise).resolves.toBe(true);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("resolves false and closes when cancelled", async () => {
    renderProvider();
    let promise!: Promise<boolean>;
    act(() => {
      promise = confirm({ title: "Proceed?", message: "Go?" });
    });
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    });
    await expect(promise).resolves.toBe(false);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("resolves false when dismissed via the overlay", async () => {
    renderProvider();
    let promise!: Promise<boolean>;
    act(() => {
      promise = confirm({ title: "Proceed?", message: "Go?" });
    });
    act(() => {
      fireEvent.click(screen.getByTestId("modal-overlay"));
    });
    await expect(promise).resolves.toBe(false);
  });

  it("passes tone and labels through to the modal", () => {
    renderProvider();
    act(() => {
      void confirm({
        title: "Start Fresh",
        message: "Destructive.",
        tone: "danger",
        confirmLabel: "Erase everything",
        cancelLabel: "Keep my data",
      });
    });
    expect(screen.getByText("Destructive.")).toHaveAttribute(
      "data-tone",
      "danger"
    );
    expect(
      screen.getByRole("button", { name: "Erase everything" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Keep my data" })
    ).toBeInTheDocument();
  });

  it("resolves a superseded confirm as cancelled when a new one opens", async () => {
    renderProvider();
    let first!: Promise<boolean>;
    act(() => {
      first = confirm({ title: "First", message: "first?" });
    });
    act(() => {
      void confirm({ title: "Second", message: "second?" });
    });
    await expect(first).resolves.toBe(false);
    expect(screen.getByText("second?")).toBeInTheDocument();
  });
});

describe("useConfirm", () => {
  it("throws when used outside a ConfirmProvider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderHook(() => useConfirm())).toThrow();
    spy.mockRestore();
  });
});

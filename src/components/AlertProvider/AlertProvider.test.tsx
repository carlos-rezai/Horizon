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
import AlertProvider from "./AlertProvider";
import { useAlert } from "./useAlert";

type AlertFn = ReturnType<typeof useAlert>["alert"];

let alert: AlertFn;

// Captures the alert function so tests can drive the provider imperatively.
// The render-phase write to an outer binding is the point of this component,
// and is safe here because nothing re-renders it concurrently.
function Capture() {
  // eslint-disable-next-line react-hooks/globals
  alert = useAlert().alert;
  return null;
}

function renderProvider() {
  return render(
    <ThemeProvider theme={theme}>
      <AlertProvider>
        <Capture />
      </AlertProvider>
    </ThemeProvider>
  );
}

afterEach(() => {
  cleanup();
});

describe("AlertProvider / alert", () => {
  it("shows an AlertModal with the given title and message", () => {
    renderProvider();
    act(() => {
      alert({ title: "Backup failed", message: "It broke." });
    });
    expect(screen.getByText("Backup failed")).toBeInTheDocument();
    expect(screen.getByText("It broke.")).toBeInTheDocument();
  });

  it("shows nothing until alert is called", () => {
    renderProvider();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("passes tone and detail through to the modal", () => {
    renderProvider();
    act(() => {
      alert({
        title: "Restore failed",
        message: "Could not restore.",
        detail: "bad file",
        tone: "error",
      });
    });
    expect(screen.getByText("Could not restore.")).toHaveAttribute(
      "data-tone",
      "error"
    );
    expect(screen.getByText("bad file")).toBeInTheDocument();
  });

  it("dismisses the modal when acknowledged", () => {
    renderProvider();
    act(() => {
      alert({ title: "Done", message: "All good." });
    });
    expect(screen.getByText("All good.")).toBeInTheDocument();
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "OK" }));
    });
    expect(screen.queryByText("All good.")).toBeNull();
  });

  it("shows one modal at a time — a second alert replaces the first", () => {
    renderProvider();
    act(() => {
      alert({ title: "First", message: "first message" });
    });
    act(() => {
      alert({ title: "Second", message: "second message" });
    });
    expect(screen.queryByText("first message")).toBeNull();
    expect(screen.getByText("second message")).toBeInTheDocument();
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
  });
});

describe("useAlert", () => {
  it("throws when used outside an AlertProvider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderHook(() => useAlert())).toThrow();
    spy.mockRestore();
  });
});

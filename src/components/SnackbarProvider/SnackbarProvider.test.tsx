// @vitest-environment jsdom
import {
  render,
  screen,
  cleanup,
  fireEvent,
  act,
  renderHook,
} from "@testing-library/react";
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { ThemeProvider } from "styled-components";
import { theme } from "../../tokens";
import SnackbarProvider from "./SnackbarProvider";
import { useSnackbar } from "./useSnackbar";

type NotifyFn = ReturnType<typeof useSnackbar>["notify"];

let notify: NotifyFn;

// Captures the notify function so tests can drive the provider imperatively.
// The render-phase write to an outer binding is the point of this component,
// and is safe here because nothing re-renders it concurrently.
function Capture() {
  // eslint-disable-next-line react-hooks/globals
  notify = useSnackbar().notify;
  return null;
}

function renderProvider() {
  return render(
    <ThemeProvider theme={theme}>
      <SnackbarProvider>
        <Capture />
      </SnackbarProvider>
    </ThemeProvider>
  );
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
  cleanup();
});

describe("SnackbarProvider / notify", () => {
  it("renders a snackbar with the given message", () => {
    renderProvider();
    act(() => {
      notify("Saved");
    });
    expect(screen.getByText("Saved")).toBeInTheDocument();
  });

  it("reflects each variant on the snackbar status element", () => {
    const variants = ["info", "success", "warning", "error"] as const;
    for (const variant of variants) {
      renderProvider();
      act(() => {
        notify("variant message", variant);
      });
      expect(screen.getByRole("status")).toHaveAttribute(
        "data-variant",
        variant
      );
      cleanup();
    }
  });

  it("caps the queue at the four most recent notifications", () => {
    renderProvider();
    act(() => {
      notify("one");
      notify("two");
      notify("three");
      notify("four");
      notify("five");
    });
    expect(screen.queryByText("one")).not.toBeInTheDocument();
    expect(screen.getByText("two")).toBeInTheDocument();
    expect(screen.getByText("five")).toBeInTheDocument();
  });

  it("auto-dismisses a default notification after 3200ms", () => {
    renderProvider();
    act(() => {
      notify("transient");
    });
    expect(screen.getByText("transient")).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(3200);
    });
    expect(screen.queryByText("transient")).not.toBeInTheDocument();
  });

  it("keeps error notifications visible for the longer 6000ms window", () => {
    renderProvider();
    act(() => {
      notify("boom", "error");
    });
    act(() => {
      vi.advanceTimersByTime(3200);
    });
    expect(screen.getByText("boom")).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(2800);
    });
    expect(screen.queryByText("boom")).not.toBeInTheDocument();
  });

  it("renders an action button, fires its onClick, then dismisses", () => {
    renderProvider();
    const onClick = vi.fn();
    act(() => {
      notify("Deleted", {
        variant: "success",
        action: { label: "Undo", onClick },
      });
    });
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    });
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Deleted")).not.toBeInTheDocument();
  });

  it("dismisses when the close button is clicked", () => {
    renderProvider();
    act(() => {
      notify("info message", "info");
    });
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /close/i }));
    });
    expect(screen.queryByText("info message")).not.toBeInTheDocument();
  });

  it("renders no action button for a plain notification (account-style delete)", () => {
    renderProvider();
    act(() => {
      notify("Account deleted", "success");
    });
    expect(
      screen.queryByRole("button", { name: "Undo" })
    ).not.toBeInTheDocument();
    expect(screen.getAllByRole("button")).toHaveLength(1);
  });
});

describe("useSnackbar", () => {
  it("throws when used outside a SnackbarProvider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderHook(() => useSnackbar())).toThrow();
    spy.mockRestore();
  });
});

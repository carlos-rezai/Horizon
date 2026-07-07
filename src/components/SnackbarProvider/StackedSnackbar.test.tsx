// @vitest-environment jsdom
import { useEffect, type MutableRefObject } from "react";
import { render, screen, cleanup, act } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import { ThemeProvider } from "styled-components";
import { theme } from "../../tokens";
import SnackbarProvider from "./SnackbarProvider";
import StackedSnackbar from "./StackedSnackbar";
import { useSnackbar } from "./useSnackbar";

type NotifyFn = ReturnType<typeof useSnackbar>["notify"];

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
}

// Captures the provider's notify without a module-global reassignment.
function Notifier({
  notifyRef,
}: {
  notifyRef: MutableRefObject<NotifyFn | null>;
}) {
  const { notify } = useSnackbar();
  useEffect(() => {
    notifyRef.current = notify;
  }, [notify, notifyRef]);
  return null;
}

afterEach(cleanup);

describe("StackedSnackbar", () => {
  it("renders standalone (no provider) as a fixed fallback", () => {
    renderWithTheme(
      <StackedSnackbar
        message="Standalone"
        variant="error"
        onClose={() => {}}
      />
    );

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByText("Standalone")).toBeInTheDocument();
  });

  it("portals into the provider's single stack so persistent and transient snackbars share one container", () => {
    const notifyRef: MutableRefObject<NotifyFn | null> = { current: null };

    renderWithTheme(
      <SnackbarProvider>
        <Notifier notifyRef={notifyRef} />
        <StackedSnackbar
          message="Persistent"
          variant="error"
          onClose={() => {}}
        />
      </SnackbarProvider>
    );

    act(() => {
      notifyRef.current?.("Transient", "success");
    });

    const statuses = screen.getAllByRole("status");
    expect(statuses).toHaveLength(2);
    // Both live in the same fixed stacking region — not two overlapping corners.
    const parents = new Set(statuses.map((el) => el.parentElement));
    expect(parents.size).toBe(1);
  });
});

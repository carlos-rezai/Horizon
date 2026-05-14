// @vitest-environment jsdom
import {
  render,
  screen,
  cleanup,
  fireEvent,
  act,
} from "@testing-library/react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { ThemeProvider } from "styled-components";
import { theme } from "../../../tokens";
import UpdateBanner from "./UpdateBanner";

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
}

afterEach(() => {
  cleanup();
  delete window.horizon;
  vi.restoreAllMocks();
});

describe("UpdateBanner", () => {
  it("renders nothing when state is idle", () => {
    window.horizon = {
      apiBaseUrl: "",
      platform: "win32",
      updates: {
        onUpdateDownloaded: () => () => {},
        quitAndInstall: vi.fn(),
        downloadUpdate: vi.fn(),
      },
    };

    const { container } = renderWithTheme(<UpdateBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders a Snackbar with 'Restart to update' when state is ready", () => {
    let registeredCb: (() => void) | null = null;
    window.horizon = {
      apiBaseUrl: "",
      platform: "win32",
      updates: {
        onUpdateDownloaded: (cb) => {
          registeredCb = cb;
          return () => {};
        },
        quitAndInstall: vi.fn(),
        downloadUpdate: vi.fn(),
      },
    };

    renderWithTheme(<UpdateBanner />);
    expect(
      screen.queryByRole("button", { name: "Restart to update" })
    ).not.toBeInTheDocument();

    act(() => {
      registeredCb?.();
    });

    expect(
      screen.getByRole("button", { name: "Restart to update" })
    ).toBeInTheDocument();
  });

  it("hides the banner when the close button is clicked", () => {
    let registeredCb: (() => void) | null = null;
    window.horizon = {
      apiBaseUrl: "",
      platform: "win32",
      updates: {
        onUpdateDownloaded: (cb) => {
          registeredCb = cb;
          return () => {};
        },
        quitAndInstall: vi.fn(),
        downloadUpdate: vi.fn(),
      },
    };

    renderWithTheme(<UpdateBanner />);

    act(() => {
      registeredCb?.();
    });

    expect(
      screen.getByRole("button", { name: "Restart to update" })
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /close/i }));

    expect(
      screen.queryByRole("button", { name: "Restart to update" })
    ).not.toBeInTheDocument();
  });
});

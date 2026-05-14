// @vitest-environment jsdom
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { ThemeProvider } from "styled-components";
import { theme } from "../../../tokens";
import AppVersion from "./AppVersion";

afterEach(() => {
  cleanup();
  delete window.horizon;
  vi.restoreAllMocks();
});

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
}

describe("AppVersion", () => {
  it("renders the version string from getAppVersion", async () => {
    window.horizon = {
      apiBaseUrl: "",
      platform: "win32",
      updates: {
        onUpdateDownloaded: () => () => {},
        quitAndInstall: vi.fn(),
        downloadUpdate: vi.fn(),
        getAppVersion: vi.fn().mockResolvedValue("0.2.0"),
        getAutoDownload: vi.fn().mockResolvedValue(true),
        setAutoDownload: vi.fn().mockResolvedValue(undefined),
      },
    };

    renderWithTheme(<AppVersion />);

    await waitFor(() => {
      expect(screen.getByText("0.2.0")).toBeInTheDocument();
    });
  });
});

// @vitest-environment jsdom
import {
  render,
  screen,
  cleanup,
  waitFor,
  fireEvent,
} from "@testing-library/react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { ThemeProvider } from "styled-components";
import { theme } from "../../../tokens";
import SnackbarProvider from "../../../components/SnackbarProvider/SnackbarProvider";
import AboutCard from "./AboutCard";

afterEach(() => {
  cleanup();
  delete window.horizon;
  vi.restoreAllMocks();
});

function mockHorizon(appVersion = "1.0.1") {
  window.horizon = {
    apiBaseUrl: "",
    platform: "win32",
    electronVersion: "0.0.0",
    updates: {
      onUpdateDownloaded: () => () => {},
      onUpdateAvailable: () => () => {},
      quitAndInstall: vi.fn(),
      downloadUpdate: vi.fn(),
      getAppVersion: vi.fn().mockResolvedValue(appVersion),
      getAutoDownload: vi.fn().mockResolvedValue(true),
      setAutoDownload: vi.fn().mockResolvedValue(undefined),
    },
  };
}

function renderCard() {
  return render(
    <ThemeProvider theme={theme}>
      <SnackbarProvider>
        <AboutCard />
      </SnackbarProvider>
    </ThemeProvider>
  );
}

describe("AboutCard", () => {
  it("renders the product description and tech line", () => {
    mockHorizon();
    renderCard();
    expect(
      screen.getByText(/personal finance tracker for long-term thinkers/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/electron · react · sqlite · offline-first/i)
    ).toBeInTheDocument();
  });

  it("shows the real app version", async () => {
    mockHorizon("2.3.4");
    renderCard();
    await waitFor(() => {
      expect(screen.getByText("2.3.4")).toBeInTheDocument();
    });
  });

  it("surfaces update status via a snackbar when Check for updates is clicked", async () => {
    mockHorizon("1.0.1");
    renderCard();
    await waitFor(() => expect(screen.getByText("1.0.1")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: /check for updates/i }));

    expect(screen.getByText(/latest version/i)).toBeInTheDocument();
  });
});

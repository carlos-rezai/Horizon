// @vitest-environment jsdom
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "styled-components";
import { describe, it, expect, afterEach, vi } from "vitest";
import { theme } from "../tokens";
import SettingsStoragePage from "./SettingsStoragePage";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function renderPage() {
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter initialEntries={["/settings/storage"]}>
        <SettingsStoragePage />
      </MemoryRouter>
    </ThemeProvider>
  );
}

describe("SettingsStoragePage — loading state", () => {
  it("renders a loading indicator before the fetch resolves", () => {
    let resolveFetch: ((value: Response) => void) | null = null;
    const pending = new Promise<Response>((resolve) => {
      resolveFetch = resolve;
    });
    vi.spyOn(globalThis, "fetch").mockReturnValue(pending);

    renderPage();

    expect(screen.getByRole("status")).toBeInTheDocument();

    if (resolveFetch) {
      resolveFetch({
        ok: true,
        json: async () => ({
          driver: "sqlite",
          schemaVersion: 2,
          integrity: "ok",
          path: ":memory:",
          sizeBytes: 0,
        }),
      } as Response);
    }
  });
});

describe("SettingsStoragePage — SQLite status", () => {
  it("renders driver, schemaVersion, integrity, path and sizeBytes", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        driver: "sqlite",
        schemaVersion: 2,
        integrity: "ok",
        path: "/Users/x/horizon.db",
        sizeBytes: 12345,
      }),
    } as Response);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/sqlite/i)).toBeInTheDocument();
    });
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("ok")).toBeInTheDocument();
    expect(screen.getByText("/Users/x/horizon.db")).toBeInTheDocument();
    expect(screen.getByText(/12345/)).toBeInTheDocument();
  });
});

describe("SettingsStoragePage — Mongo status", () => {
  it("renders driver/schemaVersion/integrity but does not render path or sizeBytes", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        driver: "mongo",
        schemaVersion: 0,
        integrity: "ok",
      }),
    } as Response);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/mongo/i)).toBeInTheDocument();
    });
    expect(screen.getByText("0")).toBeInTheDocument();
    expect(screen.getByText("ok")).toBeInTheDocument();
    expect(screen.queryByText(/path/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/sizeBytes|size/i)).not.toBeInTheDocument();
  });
});

describe("SettingsStoragePage — error state", () => {
  it("renders an error message when the fetch fails", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({}),
    } as Response);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });
});

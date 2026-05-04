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

describe("SettingsStoragePage — smoke", () => {
  it("renders the Storage heading and the StorageStatus component", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        driver: "sqlite",
        schemaVersion: 2,
        integrity: "ok",
        path: ":memory:",
        sizeBytes: 0,
      }),
    } as Response);

    renderPage();

    expect(
      screen.getByRole("heading", { level: 1, name: /storage/i })
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/sqlite/i)).toBeInTheDocument();
    });
  });
});

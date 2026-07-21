// @vitest-environment jsdom
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { ThemeProvider } from "styled-components";
import { theme } from "../../tokens";
import SnackbarProvider from "../../components/SnackbarProvider/SnackbarProvider";
import CacheProvider from "../../components/CacheProvider/CacheProvider";
import ImportPage from "./ImportPage";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function mockFetch() {
  // accounts, then categories (and any further calls) resolve to empty arrays.
  vi.spyOn(globalThis, "fetch").mockResolvedValue({
    ok: true,
    json: async () => [],
  } as Response);
}

function renderPage() {
  return render(
    <ThemeProvider theme={theme}>
      <CacheProvider>
        <SnackbarProvider>
          <ImportPage />
        </SnackbarProvider>
      </CacheProvider>
    </ThemeProvider>
  );
}

describe("ImportPage", () => {
  beforeEach(mockFetch);

  it("renders an Import heading", async () => {
    renderPage();
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /import/i })
      ).toBeInTheDocument();
    });
  });
});

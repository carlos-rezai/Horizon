// @vitest-environment jsdom
import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "styled-components";
import { theme } from "../../tokens";
import AppLayout from "./AppLayout";

function renderAtRoute(path: string) {
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route
            path="/"
            element={
              <AppLayout>
                <p>Dashboard content</p>
              </AppLayout>
            }
          />
          <Route
            path="/accounts/:id"
            element={
              <AppLayout>
                <p>Account content</p>
              </AppLayout>
            }
          />
        </Routes>
      </MemoryRouter>
    </ThemeProvider>
  );
}

afterEach(() => {
  cleanup();
});

describe("AppLayout — wordmark", () => {
  it("renders the Horizon wordmark on the dashboard route", () => {
    renderAtRoute("/");
    expect(screen.getByText("Horizon")).toBeInTheDocument();
  });

  it("renders the Horizon wordmark on the account detail route", () => {
    renderAtRoute("/accounts/abc123");
    expect(screen.getByText("Horizon")).toBeInTheDocument();
  });
});

describe("AppLayout — back arrow", () => {
  it("does not render a back arrow on the dashboard route", () => {
    renderAtRoute("/");
    expect(
      screen.queryByRole("button", { name: /back/i })
    ).not.toBeInTheDocument();
  });

  it("does not render a back arrow on the account detail route", () => {
    renderAtRoute("/accounts/abc123");
    expect(
      screen.queryByRole("button", { name: /back/i })
    ).not.toBeInTheDocument();
  });
});

describe("AppLayout — content", () => {
  it("renders its children", () => {
    renderAtRoute("/");
    expect(screen.getByText("Dashboard content")).toBeInTheDocument();
  });
});

describe("AppLayout — settings navigation", () => {
  it("exposes a Settings link that targets /settings/storage", () => {
    renderAtRoute("/");
    const link = screen.getByRole("link", { name: /settings/i });
    expect(link).toHaveAttribute("href", "/settings/storage");
  });
});

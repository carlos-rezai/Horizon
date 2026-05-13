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
            path="/plan"
            element={
              <AppLayout>
                <p>Plan content</p>
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
          <Route
            path="/settings/storage"
            element={
              <AppLayout>
                <p>Settings content</p>
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

  it("renders the Horizon wordmark on the plan route", () => {
    renderAtRoute("/plan");
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

describe("AppLayout — sidebar nav links", () => {
  it("renders a Dashboard link targeting /", () => {
    renderAtRoute("/");
    const link = screen.getByRole("link", { name: /dashboard/i });
    expect(link).toHaveAttribute("href", "/");
  });

  it("renders a Financial Plan link targeting /plan", () => {
    renderAtRoute("/");
    const link = screen.getByRole("link", { name: /financial plan/i });
    expect(link).toHaveAttribute("href", "/plan");
  });

  it("renders a Settings link targeting /settings/storage", () => {
    renderAtRoute("/");
    const link = screen.getByRole("link", { name: /settings/i });
    expect(link).toHaveAttribute("href", "/settings/storage");
  });

  it("all three nav links are present on the plan route", () => {
    renderAtRoute("/plan");
    expect(
      screen.getByRole("link", { name: /dashboard/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /financial plan/i })
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /settings/i })).toBeInTheDocument();
  });
});

describe("AppLayout — active nav state", () => {
  it("Dashboard link has aria-current='page' when at /", () => {
    renderAtRoute("/");
    const link = screen.getByRole("link", { name: /dashboard/i });
    expect(link).toHaveAttribute("aria-current", "page");
  });

  it("Dashboard link does not have aria-current='page' when at /plan", () => {
    renderAtRoute("/plan");
    const link = screen.getByRole("link", { name: /dashboard/i });
    expect(link).not.toHaveAttribute("aria-current", "page");
  });

  it("Financial Plan link has aria-current='page' when at /plan", () => {
    renderAtRoute("/plan");
    const link = screen.getByRole("link", { name: /financial plan/i });
    expect(link).toHaveAttribute("aria-current", "page");
  });

  it("Financial Plan link does not have aria-current='page' when at /", () => {
    renderAtRoute("/");
    const link = screen.getByRole("link", { name: /financial plan/i });
    expect(link).not.toHaveAttribute("aria-current", "page");
  });
});

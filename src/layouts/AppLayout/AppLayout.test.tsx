// @vitest-environment jsdom
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
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
            element={<AppLayout><p>Dashboard content</p></AppLayout>}
          />
          <Route
            path="/accounts/:id"
            element={<AppLayout><p>Account content</p></AppLayout>}
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
    expect(screen.queryByRole("button", { name: /back/i })).not.toBeInTheDocument();
  });

  it("renders a back arrow on the account detail route", () => {
    renderAtRoute("/accounts/abc123");
    expect(screen.getByRole("button", { name: /back/i })).toBeInTheDocument();
  });

  it("navigates to / when the back arrow is clicked", () => {
    renderAtRoute("/accounts/abc123");
    fireEvent.click(screen.getByRole("button", { name: /back/i }));
    expect(screen.getByText("Dashboard content")).toBeInTheDocument();
  });
});

describe("AppLayout — content", () => {
  it("renders its children", () => {
    renderAtRoute("/");
    expect(screen.getByText("Dashboard content")).toBeInTheDocument();
  });
});

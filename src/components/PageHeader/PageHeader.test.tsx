// @vitest-environment jsdom
import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import { ThemeProvider } from "styled-components";
import { theme } from "../../tokens";
import PageHeader from "./PageHeader";

afterEach(() => {
  cleanup();
});

describe("PageHeader", () => {
  it("renders the provided text as a level-1 heading", () => {
    render(
      <ThemeProvider theme={theme}>
        <PageHeader text="Dashboard" />
      </ThemeProvider>
    );

    expect(
      screen.getByRole("heading", { level: 1, name: "Dashboard" })
    ).toBeInTheDocument();
  });

  it("renders different text passed via prop", () => {
    render(
      <ThemeProvider theme={theme}>
        <PageHeader text="Financial Plan" />
      </ThemeProvider>
    );

    expect(
      screen.getByRole("heading", { level: 1, name: "Financial Plan" })
    ).toBeInTheDocument();
  });
});

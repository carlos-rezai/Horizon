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

describe("PageHeader — prototype slots", () => {
  it("renders the title as a level-1 heading", () => {
    render(
      <ThemeProvider theme={theme}>
        <PageHeader title="Dashboard" />
      </ThemeProvider>
    );
    expect(
      screen.getByRole("heading", { level: 1, name: "Dashboard" })
    ).toBeInTheDocument();
  });

  it("renders the overline above the title", () => {
    render(
      <ThemeProvider theme={theme}>
        <PageHeader overline="Overview" title="Dashboard" />
      </ThemeProvider>
    );
    expect(screen.getByText("Overview")).toBeInTheDocument();
  });

  it("renders the subtitle below the title", () => {
    render(
      <ThemeProvider theme={theme}>
        <PageHeader
          title="Dashboard"
          subtitle="Your financial horizon at a glance"
        />
      </ThemeProvider>
    );
    expect(
      screen.getByText("Your financial horizon at a glance")
    ).toBeInTheDocument();
  });

  it("renders the actions slot", () => {
    render(
      <ThemeProvider theme={theme}>
        <PageHeader title="Dashboard" actions={<button>New account</button>} />
      </ThemeProvider>
    );
    expect(
      screen.getByRole("button", { name: "New account" })
    ).toBeInTheDocument();
  });
});

// @vitest-environment jsdom
import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import { ThemeProvider } from "styled-components";
import { theme } from "../../tokens";
import CardHeader from "./CardHeader";

afterEach(cleanup);

function renderCardHeader(text: string) {
  return render(
    <ThemeProvider theme={theme}>
      <CardHeader text={text} />
    </ThemeProvider>
  );
}

describe("CardHeader", () => {
  it("renders the text as a heading", () => {
    renderCardHeader("Plan Overview");
    expect(
      screen.getByRole("heading", { name: "Plan Overview" })
    ).toBeInTheDocument();
  });

  it("renders the heading at level 2", () => {
    renderCardHeader("Accounts Summary");
    expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
  });
});

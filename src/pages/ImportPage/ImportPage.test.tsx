// @vitest-environment jsdom
import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import { ThemeProvider } from "styled-components";
import { theme } from "../../tokens";
import ImportPage from "./ImportPage";

afterEach(() => {
  cleanup();
});

describe("ImportPage", () => {
  it("renders an Import heading", () => {
    render(
      <ThemeProvider theme={theme}>
        <ImportPage />
      </ThemeProvider>
    );
    expect(
      screen.getByRole("heading", { name: /import/i })
    ).toBeInTheDocument();
  });
});

// @vitest-environment jsdom
import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import { ThemeProvider } from "styled-components";
import { theme } from "../../tokens";
import SettingRow from "./SettingRow";

afterEach(cleanup);

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
}

describe("SettingRow", () => {
  it("renders the title and description", () => {
    renderWithTheme(
      <SettingRow
        icon={<svg data-testid="icon" />}
        title="Automatic updates"
        desc="Via GitHub Releases"
      />
    );

    expect(screen.getByText("Automatic updates")).toBeInTheDocument();
    expect(screen.getByText("Via GitHub Releases")).toBeInTheDocument();
  });

  it("renders the leading icon and the right-slot control", () => {
    renderWithTheme(
      <SettingRow
        icon={<svg data-testid="icon" />}
        title="Privacy"
        desc="No cloud"
      >
        <button>Local</button>
      </SettingRow>
    );

    expect(screen.getByTestId("icon")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Local" })).toBeInTheDocument();
  });
});

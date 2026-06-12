// @vitest-environment jsdom
import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import { ThemeProvider, StyleSheetManager } from "styled-components";
import { theme } from "../../tokens";
import { chartColors } from "../../tokens/colors";
import Avatar from "./Avatar";

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
}

function renderForCSS(ui: React.ReactElement) {
  return render(
    <StyleSheetManager disableCSSOMInjection>
      <ThemeProvider theme={theme}>{ui}</ThemeProvider>
    </StyleSheetManager>
  );
}

function getInjectedCSS(): string {
  return Array.from(document.querySelectorAll("style"))
    .map((el) => el.textContent ?? "")
    .join("\n");
}

afterEach(() => {
  cleanup();
});

describe("Avatar", () => {
  it("renders the account's lucide icon as an svg", () => {
    const { container } = renderWithTheme(
      <Avatar
        account={{ kind: "Girokonto", icon: "Wallet", color: "#7FA7D9" }}
      />
    );
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("renders without throwing when the account has no icon", () => {
    expect(() =>
      renderWithTheme(
        <Avatar account={{ kind: "Girokonto", icon: null, color: "#7FA7D9" }} />
      )
    ).not.toThrow();
    expect(screen.getByTestId("avatar")).toBeInTheDocument();
  });

  it("tints the avatar with the account's own colour", () => {
    renderForCSS(
      <Avatar
        account={{ kind: "Girokonto", icon: "Wallet", color: "#7FA7D9" }}
      />
    );
    expect(getInjectedCSS()).toContain("#7FA7D9");
  });

  it("falls back to the per-kind colour when the account colour is null", () => {
    renderForCSS(
      <Avatar account={{ kind: "Mortgage", icon: "Home", color: null }} />
    );
    expect(getInjectedCSS()).toContain(chartColors.Mortgage);
  });

  it("honours the size prop", () => {
    renderForCSS(
      <Avatar
        account={{ kind: "Girokonto", icon: "Wallet", color: "#7FA7D9" }}
        size={48}
      />
    );
    expect(getInjectedCSS()).toContain("48px");
  });
});

describe("Avatar — export", () => {
  it("is importable from src/primitives/index.ts", async () => {
    const { Avatar: AvatarFromIndex } = await import("../index");
    expect(() =>
      renderWithTheme(
        <AvatarFromIndex
          account={{ kind: "Girokonto", icon: "Wallet", color: "#7FA7D9" }}
        />
      )
    ).not.toThrow();
  });
});

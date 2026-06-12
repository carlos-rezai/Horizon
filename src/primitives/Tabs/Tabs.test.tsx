// @vitest-environment jsdom
import {
  render,
  screen,
  cleanup,
  fireEvent,
  within,
} from "@testing-library/react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { ThemeProvider, StyleSheetManager } from "styled-components";
import { theme } from "../../tokens";
import Tabs from "./Tabs";

const TABS = [
  { id: "a", label: "Giro", color: "#7FA7D9", count: 3 },
  { id: "b", label: "Tagesgeld" },
];

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

describe("Tabs", () => {
  it("renders one tab per item inside a tablist", () => {
    renderWithTheme(<Tabs tabs={TABS} activeId="a" onChange={() => {}} />);
    expect(screen.getByRole("tablist")).toBeInTheDocument();
    expect(screen.getAllByRole("tab")).toHaveLength(2);
  });

  it("marks the active tab as selected and the others as not selected", () => {
    renderWithTheme(<Tabs tabs={TABS} activeId="a" onChange={() => {}} />);
    const tabs = screen.getAllByRole("tab");
    expect(tabs[0]).toHaveAttribute("aria-selected", "true");
    expect(tabs[1]).toHaveAttribute("aria-selected", "false");
  });

  it("calls onChange with the tab id when a tab is clicked", () => {
    const onChange = vi.fn();
    renderWithTheme(<Tabs tabs={TABS} activeId="a" onChange={onChange} />);
    fireEvent.click(screen.getAllByRole("tab")[1]);
    expect(onChange).toHaveBeenCalledWith("b");
  });

  it("renders the count for tabs that supply one", () => {
    renderWithTheme(<Tabs tabs={TABS} activeId="a" onChange={() => {}} />);
    const firstTab = screen.getAllByRole("tab")[0];
    expect(within(firstTab).getByText("3")).toBeInTheDocument();
  });

  it("renders a colour dot for tabs that supply a colour", () => {
    renderForCSS(<Tabs tabs={TABS} activeId="a" onChange={() => {}} />);
    expect(getInjectedCSS()).toContain("#7FA7D9");
  });
});

describe("Tabs — export", () => {
  it("is importable from src/primitives/index.ts", async () => {
    const { Tabs: TabsFromIndex } = await import("../index");
    expect(() =>
      renderWithTheme(
        <TabsFromIndex tabs={TABS} activeId="a" onChange={() => {}} />
      )
    ).not.toThrow();
  });
});

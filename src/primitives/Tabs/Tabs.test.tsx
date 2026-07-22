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
import Tabs, { type TabItem } from "./Tabs";

const TABS = [
  { id: "a", label: "Giro", color: "#7FA7D9", count: 3 },
  { id: "b", label: "Tagesgeld" },
];

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
}

/**
 * Fix the strip's layout metrics so the affordance logic is decidable in
 * jsdom, where every box measures zero. The returned spy doubles as the
 * measurement counter: reading `scrollWidth` is what forces the layout.
 */
function stubStripMetrics(scrollWidth: number, clientWidth: number) {
  vi.spyOn(Element.prototype, "clientWidth", "get").mockReturnValue(
    clientWidth
  );
  return vi
    .spyOn(Element.prototype, "scrollWidth", "get")
    .mockReturnValue(scrollWidth);
}

/** Render Tabs so it can be re-rendered with fresh props under the theme. */
function renderTabs(tabs: TabItem[]) {
  const { rerender } = renderWithTheme(
    <Tabs tabs={tabs} activeId="a" onChange={() => {}} />
  );
  return {
    rerenderTabs: (next: TabItem[]) =>
      rerender(
        <ThemeProvider theme={theme}>
          <Tabs tabs={next} activeId="a" onChange={() => {}} />
        </ThemeProvider>
      ),
  };
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
  vi.restoreAllMocks();
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

describe("Tabs — scroll affordances", () => {
  it("offers a right-scroll affordance when the strip overflows", () => {
    stubStripMetrics(500, 200);
    renderTabs(TABS);
    expect(
      screen.getByRole("button", { name: "Scroll tabs right" })
    ).toBeInTheDocument();
  });

  it("offers no affordances when the strip fits", () => {
    stubStripMetrics(200, 200);
    renderTabs(TABS);
    expect(
      screen.queryByRole("button", { name: "Scroll tabs right" })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Scroll tabs left" })
    ).not.toBeInTheDocument();
  });
});

describe("Tabs — measurement cost", () => {
  it("does not re-measure the strip when re-rendered with an equivalent tab set", () => {
    const measure = stubStripMetrics(500, 200);
    const { rerenderTabs } = renderTabs([
      { id: "a", label: "Giro", count: 3 },
      { id: "b", label: "Tagesgeld" },
    ]);
    measure.mockClear();

    // A fresh array literal holding identical tabs — what SpendingList and
    // ImportHistory hand down on every single render. Measuring here forces a
    // synchronous layout inside the commit, which is the Month-switch hitch.
    rerenderTabs([
      { id: "a", label: "Giro", count: 3 },
      { id: "b", label: "Tagesgeld" },
    ]);

    expect(measure).not.toHaveBeenCalled();
  });

  it("re-measures when a tab is added", () => {
    const measure = stubStripMetrics(200, 200);
    const { rerenderTabs } = renderTabs([{ id: "a", label: "Giro" }]);
    expect(
      screen.queryByRole("button", { name: "Scroll tabs right" })
    ).not.toBeInTheDocument();

    // An account is added, so the strip now outgrows the card.
    measure.mockReturnValue(500);
    rerenderTabs([
      { id: "a", label: "Giro" },
      { id: "b", label: "Tagesgeld" },
      { id: "c", label: "Depot" },
    ]);

    expect(
      screen.getByRole("button", { name: "Scroll tabs right" })
    ).toBeInTheDocument();
  });

  it("re-measures when a tab's count changes", () => {
    const measure = stubStripMetrics(200, 200);
    const { rerenderTabs } = renderTabs([{ id: "a", label: "Giro", count: 3 }]);
    expect(
      screen.queryByRole("button", { name: "Scroll tabs right" })
    ).not.toBeInTheDocument();

    // Spending is recorded, so the count badge widens the strip.
    measure.mockReturnValue(500);
    rerenderTabs([{ id: "a", label: "Giro", count: 1240 }]);

    expect(
      screen.getByRole("button", { name: "Scroll tabs right" })
    ).toBeInTheDocument();
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

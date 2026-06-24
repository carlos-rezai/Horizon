// @vitest-environment jsdom
import { render, screen, cleanup, within } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import { ThemeProvider } from "styled-components";
import { theme } from "../../../tokens";
import { formatBalance } from "../../../utils/format/format";
import YearComparison from "./YearComparison";

interface Row {
  category: string;
  thisYear: number;
  lastYear: number;
}

const ROWS: Row[] = [
  { category: "Groceries", thisYear: 12000, lastYear: 9000 },
  { category: "Dining", thisYear: 8000, lastYear: 8500 },
];

function renderCard(rows: Row[] = ROWS, monthLabel = "June") {
  return render(
    <ThemeProvider theme={theme}>
      <YearComparison monthLabel={monthLabel} rows={rows} />
    </ThemeProvider>
  );
}

function renderCardWithError(error: string, monthLabel = "June") {
  return render(
    <ThemeProvider theme={theme}>
      <YearComparison monthLabel={monthLabel} rows={[]} error={error} />
    </ThemeProvider>
  );
}

afterEach(cleanup);

describe("YearComparison — headings & framing", () => {
  it("renders the Year comparison / This year so far headings", () => {
    renderCard();
    expect(screen.getByText("Year comparison")).toBeInTheDocument();
    expect(screen.getByText("This year so far")).toBeInTheDocument();
  });

  it("frames the comparison with the month label", () => {
    renderCard(ROWS, "June");
    expect(screen.getByText(/Jan 1 through June/i)).toBeInTheDocument();
  });
});

describe("YearComparison — rows", () => {
  it("renders one row per provided category with its label", () => {
    renderCard();
    expect(screen.getAllByTestId("yc-row")).toHaveLength(2);
    expect(screen.getByText("Groceries")).toBeInTheDocument();
    expect(screen.getByText("Dining")).toBeInTheDocument();
  });

  it("shows the this-year magnitude as a formatted value per row", () => {
    renderCard();
    const groceriesRow = screen
      .getByText("Groceries")
      .closest("[data-testid='yc-row']") as HTMLElement;
    // formatBalance emits a U+00A0 thin space that the default normalizer
    // collapses, so a string matcher can never equal it — compare the exact
    // formatted value against the element's raw textContent instead.
    const value = formatBalance(12000);
    expect(
      within(groceriesRow).getByText((_, el) => el?.textContent === value)
    ).toBeInTheDocument();
  });

  it("renders a this-year and a last-year bar for each row", () => {
    renderCard();
    expect(screen.getAllByTestId("yc-bar-thisyear")).toHaveLength(2);
    expect(screen.getAllByTestId("yc-bar-lastyear")).toHaveLength(2);
  });

  it("colors the this-year bar with the category color", () => {
    renderCard();
    const groceriesRow = screen
      .getByText("Groceries")
      .closest("[data-testid='yc-row']") as HTMLElement;
    const thisYearBar = within(groceriesRow).getByTestId("yc-bar-thisyear");
    // Groceries resolves to the sage swatch (#74C29B) via colorForCategoryName
    expect(thisYearBar).toHaveStyle({ backgroundColor: "#74C29B" });
  });
});

describe("YearComparison — shared-max scaling", () => {
  it("scales all bars against a single shared maximum across both years", () => {
    // Largest magnitude across all bars is 12000 (Groceries this year).
    renderCard();

    const groceriesRow = screen
      .getByText("Groceries")
      .closest("[data-testid='yc-row']") as HTMLElement;
    const diningRow = screen
      .getByText("Dining")
      .closest("[data-testid='yc-row']") as HTMLElement;

    const groceriesThisYear =
      within(groceriesRow).getByTestId("yc-bar-thisyear");
    const diningThisYear = within(diningRow).getByTestId("yc-bar-thisyear");

    // 12000 / 12000 = 100%, 8000 / 12000 ≈ 66.66%
    expect(groceriesThisYear).toHaveStyle({ width: "100%" });
    expect(diningThisYear.style.width).toMatch(/^66\.6/);
  });
});

describe("YearComparison — legend", () => {
  it("renders a This-year / Last-year legend", () => {
    renderCard();
    const legend = screen.getByTestId("yc-legend");
    expect(within(legend).getByText(/this year/i)).toBeInTheDocument();
    expect(within(legend).getByText(/last year/i)).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Honest states (issue #146)
// ---------------------------------------------------------------------------

describe("YearComparison — empty state", () => {
  it("shows an honest empty message when there are no rows", () => {
    renderCard([]);
    expect(screen.getByText("No spending yet this year.")).toBeInTheDocument();
  });

  it("renders no bars when there are no rows", () => {
    renderCard([]);
    expect(screen.queryAllByTestId("yc-row")).toHaveLength(0);
    expect(screen.queryAllByTestId("yc-bar-thisyear")).toHaveLength(0);
    expect(screen.queryAllByTestId("yc-bar-lastyear")).toHaveLength(0);
  });
});

describe("YearComparison — error state", () => {
  it("shows an honest error message when the fetch failed", () => {
    renderCardWithError("Failed to fetch year comparison: 500");
    expect(
      screen.getByText("Couldn’t load the year comparison.")
    ).toBeInTheDocument();
  });

  it("renders the error message, not the empty state, when error is set", () => {
    renderCardWithError("network down");
    expect(
      screen.queryByText("No spending yet this year.")
    ).not.toBeInTheDocument();
  });

  it("renders no rows or bars in the error state", () => {
    renderCardWithError("network down");
    expect(screen.queryAllByTestId("yc-row")).toHaveLength(0);
    expect(screen.queryAllByTestId("yc-bar-thisyear")).toHaveLength(0);
  });
});

describe("YearComparison — first-year case (no prior-year data)", () => {
  const FIRST_YEAR_ROWS: Row[] = [
    { category: "Groceries", thisYear: 12000, lastYear: 0 },
    { category: "Dining", thisYear: 6000, lastYear: 0 },
  ];

  it("renders this-year bars while last-year bars have zero width", () => {
    renderCard(FIRST_YEAR_ROWS);

    const groceriesRow = screen
      .getByText("Groceries")
      .closest("[data-testid='yc-row']") as HTMLElement;

    const thisYearBar = within(groceriesRow).getByTestId("yc-bar-thisyear");
    const lastYearBar = within(groceriesRow).getByTestId("yc-bar-lastyear");

    // this-year bar is scaled to the shared max (12000), last-year is empty
    expect(thisYearBar).toHaveStyle({ width: "100%" });
    expect(lastYearBar).toHaveStyle({ width: "0%" });
  });

  it("still renders both legend entries in the first-year case", () => {
    renderCard(FIRST_YEAR_ROWS);
    const legend = screen.getByTestId("yc-legend");
    expect(within(legend).getByText(/this year/i)).toBeInTheDocument();
    expect(within(legend).getByText(/last year/i)).toBeInTheDocument();
  });
});

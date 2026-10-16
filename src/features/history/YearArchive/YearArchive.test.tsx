// @vitest-environment jsdom
import {
  render,
  screen,
  within,
  cleanup,
  fireEvent,
} from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "styled-components";
import { theme } from "../../../tokens";
import YearArchive from "./YearArchive";
import type { HistoryPoint } from "../historyTypes/historyTypes";

afterEach(cleanup);

// The same de-DE currency formatter the Money primitive uses, so value
// assertions compare against exactly what renders (including the U+00A0 before
// the euro sign, which string matchers would otherwise collapse).
const eur = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
});
const euro = (cents: number) => eur.format(cents / 100);
const euroSigned = (cents: number) =>
  cents > 0 ? `+${euro(cents)}` : euro(cents);

// Points span 2021, 2022, and a partial 2023 (Jan–Mar only). 2022 holds known
// data but no imported statement, so it is listed without a badge.
const POINTS: HistoryPoint[] = [
  {
    month: "2021-11",
    totalLiquid: 100000,
    restschuld: 30000000,
    netCashflow: 5000,
    accounts: { g1: 100000 },
  },
  {
    month: "2021-12",
    totalLiquid: 110000,
    restschuld: 29900000,
    netCashflow: 7000,
    accounts: { g1: 110000 },
  },
  {
    month: "2022-06",
    totalLiquid: 200000,
    restschuld: 29000000,
    netCashflow: 3000,
    accounts: { g1: 200000 },
  },
  {
    month: "2023-01",
    totalLiquid: 300000,
    restschuld: 28000000,
    netCashflow: 2000,
    accounts: { g1: 300000 },
  },
  {
    month: "2023-02",
    totalLiquid: 320000,
    restschuld: 27500000,
    netCashflow: 4000,
    accounts: { g1: 320000 },
  },
  {
    month: "2023-03",
    totalLiquid: 355000,
    restschuld: 27000000,
    netCashflow: 9000,
    accounts: { g1: 355000 },
  },
];

const COUNTS: Record<number, number> = { 2021: 1, 2023: 2 };

function renderArchive(
  props: Partial<React.ComponentProps<typeof YearArchive>> = {}
) {
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter>
        <YearArchive points={POINTS} statementCounts={COUNTS} {...props} />
      </MemoryRouter>
    </ThemeProvider>
  );
}

// History Span (issue #239): a year is listed when at least one of its months
// is known, whether or not it holds an imported statement. The badge still
// comes from the imports list.
describe("YearArchive — years with known data", () => {
  it("lists every year that has a known month", () => {
    renderArchive();

    expect(screen.getByRole("button", { name: /2021/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /2022/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /2023/ })).toBeInTheDocument();
  });

  it("lists a year with known data but no imports, with no statement badge", () => {
    renderArchive();

    expect(screen.getByRole("button", { name: /2022/ })).toBeInTheDocument();
    // Only the two imported years carry a badge; 2022 carries none, not "0".
    expect(screen.getAllByRole("link", { name: /statement/i })).toHaveLength(2);
    expect(screen.queryByRole("link", { name: /0 statements/i })).toBeNull();
  });

  it("lists a year with known data even when there are no imports at all", () => {
    renderArchive({ statementCounts: {} });

    expect(screen.getByRole("button", { name: /2023/ })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /statement/i })).toBeNull();
  });

  it("still lists imported years with their badge", () => {
    renderArchive();

    expect(screen.getByRole("button", { name: /2021/ })).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "1 statement" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "2 statements" })
    ).toBeInTheDocument();
  });

  it("renders nothing when there are no points", () => {
    renderArchive({ points: [], statementCounts: {} });

    expect(screen.queryByRole("button", { name: /20\d\d/ })).toBeNull();
  });
});

describe("YearArchive — default expansion", () => {
  it("expands the most-recent imported year by default", () => {
    renderArchive();

    expect(screen.getByRole("button", { name: /2023/ })).toHaveAttribute(
      "aria-expanded",
      "true"
    );
  });

  it("collapses earlier years by default", () => {
    renderArchive();

    expect(screen.getByRole("button", { name: /2021/ })).toHaveAttribute(
      "aria-expanded",
      "false"
    );
  });

  it("shows the most-recent year's month rows on first render", () => {
    renderArchive();

    expect(screen.getByRole("link", { name: /Mar/i })).toBeInTheDocument();
  });

  it("does not show a collapsed year's month rows", () => {
    renderArchive();

    expect(screen.queryByRole("link", { name: /Dec/i })).toBeNull();
  });
});

describe("YearArchive — expand / collapse interaction", () => {
  it("expands a collapsed year when its header is clicked", () => {
    renderArchive();

    fireEvent.click(screen.getByRole("button", { name: /2021/ }));

    expect(screen.getByRole("button", { name: /2021/ })).toHaveAttribute(
      "aria-expanded",
      "true"
    );
    expect(screen.getByRole("link", { name: /Dec/i })).toBeInTheDocument();
  });

  it("collapses an expanded year when its header is clicked", () => {
    renderArchive();

    fireEvent.click(screen.getByRole("button", { name: /2023/ }));

    expect(screen.getByRole("button", { name: /2023/ })).toHaveAttribute(
      "aria-expanded",
      "false"
    );
    expect(screen.queryByRole("link", { name: /Mar/i })).toBeNull();
  });
});

describe("YearArchive — year summary row", () => {
  it("snapshots a partial year's last available month for Total Liquid", () => {
    renderArchive();

    // 2023 stops at March — the header must show March's Total Liquid, never a
    // phantom December or a zeroed figure.
    const yearRow = screen.getByRole("button", { name: /2023/ });
    expect(
      within(yearRow).getByText((_, el) => el?.textContent === euro(355000))
    ).toBeInTheDocument();
  });

  it("sums the year's Net Cashflow across its available months", () => {
    renderArchive();

    // 2023: 2000 + 4000 + 9000 = 15000 cents.
    const yearRow = screen.getByRole("button", { name: /2023/ });
    expect(
      within(yearRow).getByText(
        (_, el) => el?.textContent === euroSigned(15000)
      )
    ).toBeInTheDocument();
  });

  // Live-Use Repair #4 takes Net Cashflow out of the Projection Accordion and
  // out of nothing else: the shared year aggregation still sums it, and the
  // Year Archive keeps its column per year and per month.
  it("keeps its Net Cashflow column on every expanded month row", () => {
    renderArchive();

    expect(screen.getByText("Net Cashflow")).toBeInTheDocument();
    const marRow = screen.getByRole("link", { name: /Mar/i });
    expect(
      within(marRow).getByText(
        (_, el) =>
          el?.textContent === euroSigned(9000) && el.children.length === 0
      )
    ).toBeInTheDocument();
  });

  it("shows an imported-statement count badge per year", () => {
    renderArchive();

    expect(
      screen.getByRole("link", { name: /2 statements/i })
    ).toBeInTheDocument();
  });

  it("pluralizes the badge as a single statement when the count is one", () => {
    renderArchive();

    expect(
      screen.getByRole("link", { name: "1 statement" })
    ).toBeInTheDocument();
  });

  it("links the statement-count badge to /import", () => {
    renderArchive();

    expect(screen.getByRole("link", { name: /2 statements/i })).toHaveAttribute(
      "href",
      "/import"
    );
  });
});

describe("YearArchive — month deep-links", () => {
  it("deep-links each month row to /months/YYYY-MM", () => {
    renderArchive();

    expect(screen.getByRole("link", { name: /Mar/i })).toHaveAttribute(
      "href",
      "/months/2023-03"
    );
    expect(screen.getByRole("link", { name: /Jan/i })).toHaveAttribute(
      "href",
      "/months/2023-01"
    );
  });

  it("deep-links a month row from a year expanded on interaction", () => {
    renderArchive();

    fireEvent.click(screen.getByRole("button", { name: /2021/ }));

    expect(screen.getByRole("link", { name: /Dec/i })).toHaveAttribute(
      "href",
      "/months/2021-12"
    );
  });
});

// ---------------------------------------------------------------------------
// Unknown months (Balance Anchor, issue #235) — a month before Known Since
// carries `null` and reads "—", never "€0".
// ---------------------------------------------------------------------------

describe("YearArchive — Unknown months", () => {
  // 2023 is wholly before Known Since; 2024 becomes known in March.
  const UNKNOWN_POINTS: HistoryPoint[] = [
    {
      month: "2023-11",
      totalLiquid: null,
      restschuld: null,
      netCashflow: 0,
      accounts: { g1: null },
    },
    {
      month: "2023-12",
      totalLiquid: null,
      restschuld: null,
      netCashflow: 0,
      accounts: { g1: null },
    },
    {
      month: "2024-01",
      totalLiquid: null,
      restschuld: null,
      netCashflow: 0,
      accounts: { g1: null },
    },
    {
      month: "2024-03",
      totalLiquid: 355000,
      restschuld: 27000000,
      netCashflow: 9000,
      accounts: { g1: 355000 },
    },
  ];

  function renderUnknown() {
    return renderArchive({
      points: UNKNOWN_POINTS,
      statementCounts: { 2023: 1, 2024: 1 },
    });
  }

  it("renders — for a month row's Unknown Total Liquid and Restschuld, never €0", () => {
    renderUnknown();

    const janRow = screen.getByRole("link", { name: /Jan/i });
    expect(within(janRow).getAllByText("—")).toHaveLength(2);
    expect(
      within(janRow).queryByText(
        (_, el) => el?.textContent === euro(0) && el.children.length === 0
      )
    ).toBeNull();
  });

  it("does not list a year in which every month is Unknown, even with a statement", () => {
    renderUnknown();

    expect(screen.queryByRole("button", { name: /2023/ })).toBeNull();
    expect(screen.getByRole("button", { name: /2024/ })).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Paydown Bridge (Financial History, issue #240) — the bridge is not monthly
// data, so a year it alone covers is not listed.
// ---------------------------------------------------------------------------

describe("YearArchive — Paydown Bridge", () => {
  // 2025 is covered only by the bridge; the mortgage is Known Since 2026-01.
  const BRIDGE_POINTS = [
    {
      month: "2025-11",
      totalLiquid: null,
      restschuld: null,
      restschuldBridge: 20000000,
      netCashflow: 0,
      accounts: { m1: null },
    },
    {
      month: "2025-12",
      totalLiquid: null,
      restschuld: null,
      restschuldBridge: 19500000,
      netCashflow: 0,
      accounts: { m1: null },
    },
    {
      month: "2026-01",
      totalLiquid: null,
      restschuld: 19000000,
      restschuldBridge: 19000000,
      netCashflow: 0,
      accounts: { m1: 19000000 },
    },
  ] as HistoryPoint[];

  it("does not list a year covered only by the bridge", () => {
    renderArchive({ points: BRIDGE_POINTS, statementCounts: {} });

    expect(screen.queryByRole("button", { name: /2025/ })).toBeNull();
    expect(screen.getByRole("button", { name: /2026/ })).toBeInTheDocument();
  });
});

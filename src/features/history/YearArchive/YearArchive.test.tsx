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
import type { HistoryPoint } from "../historyTypes";

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

// Points span 2021, 2022, and a partial 2023 (Jan–Mar only). 2022 is present in
// the data but deliberately absent from `years` — it must never render.
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

const YEARS = [2021, 2023];
const COUNTS: Record<number, number> = { 2021: 1, 2023: 2 };

function renderArchive(
  props: Partial<React.ComponentProps<typeof YearArchive>> = {}
) {
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter>
        <YearArchive
          points={POINTS}
          years={YEARS}
          statementCounts={COUNTS}
          {...props}
        />
      </MemoryRouter>
    </ThemeProvider>
  );
}

describe("YearArchive — import-gated years", () => {
  it("renders a section for each year in `years`", () => {
    renderArchive();

    expect(screen.getByRole("button", { name: /2021/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /2023/ })).toBeInTheDocument();
  });

  it("never renders a year that has points but no imports", () => {
    renderArchive();

    expect(
      screen.queryByRole("button", { name: /2022/ })
    ).not.toBeInTheDocument();
  });

  it("renders nothing meaningful when there are no imported years", () => {
    renderArchive({ years: [], statementCounts: {} });

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

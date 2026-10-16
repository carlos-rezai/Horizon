import { useState } from "react";
import { ChevronRight } from "lucide-react";
import Money from "../../../primitives/Money/Money";
import { formatMonth } from "../../../utils/format/format";
import type { HistoryPoint } from "../historyTypes/historyTypes";
import { isUnknownMonth } from "../knownSince/knownSince";
import {
  StyledArchive,
  StyledSectionHead,
  StyledSectionTitle,
  StyledColumnHeader,
  StyledYearSection,
  StyledYearRow,
  StyledYearHeader,
  StyledChevron,
  StyledYearLabel,
  StyledCountBadge,
  StyledMonthRow,
  StyledMonthName,
  StyledNum,
} from "./YearArchive.styles";

interface Props {
  /** Reconstructed months across all imported periods. */
  points: HistoryPoint[];
  /** Years with at least one imported statement — the only years that render. */
  years: number[];
  /** Imported-statement count per year, keyed by year. */
  statementCounts: Record<number, number>;
}

/** A balance cell: "—" for an Unknown (null) value, never €0. */
function BalanceCell({ cents }: { cents: number | null | undefined }) {
  return cents === null || cents === undefined ? (
    <span>—</span>
  ) : (
    <Money cents={cents} />
  );
}

/**
 * A Net Cashflow cell, empty when the period holds no known month: an Unknown
 * month's Net Cashflow is not a real €0, so the cell never reads €0.
 */
function CashflowCell({ cents, known }: { cents: number; known: boolean }) {
  return known ? <Money cents={cents} sign /> : <span />;
}

function monthsOfYear(points: HistoryPoint[], year: number): HistoryPoint[] {
  return points.filter((p) => Number(p.month.slice(0, 4)) === year);
}

/**
 * The Year Archive lists only years that hold imported statements. Each year
 * summarises its own months — Total Liquid and Restschuld snapshot the last
 * available month (partial-year safe), Net Cashflow is the year's sum — and
 * every month row deep-links into the existing Month Overview.
 */
export default function YearArchive({ points, years, statementCounts }: Props) {
  // Import-gated: never render a year absent from `years`, even if `points`
  // carry it. Descending so the newest imported year sits on top.
  const orderedYears = [...years].sort((a, b) => b - a);

  const [expanded, setExpanded] = useState<number | null>(
    orderedYears.length > 0 ? orderedYears[0] : null
  );

  if (orderedYears.length === 0) return null;

  function toggleYear(year: number) {
    setExpanded((prev) => (prev === year ? null : year));
  }

  return (
    <StyledArchive>
      <StyledSectionHead>
        <StyledSectionTitle>Year Archive</StyledSectionTitle>
      </StyledSectionHead>

      <StyledColumnHeader>
        <span />
        <span>Period</span>
        <span>Total Liquid</span>
        <span>Restschuld</span>
        <span>Net Cashflow</span>
        <span>Statements</span>
      </StyledColumnHeader>

      {orderedYears.map((year) => {
        const isOpen = expanded === year;
        const count = statementCounts[year] ?? 0;
        const months = monthsOfYear(points, year);
        const lastMonth = months.at(-1);
        const yearKnown = months.some((p) => !isUnknownMonth(p));
        // Total Liquid / Restschuld snapshot the year's final available month
        // (possibly Unknown); Net Cashflow is the year's sum.
        const yearCashflow = months.reduce((sum, p) => sum + p.netCashflow, 0);

        return (
          <StyledYearSection key={year}>
            <StyledYearRow $open={isOpen}>
              <StyledYearHeader
                type="button"
                aria-expanded={isOpen}
                onClick={() => toggleYear(year)}
              >
                <StyledChevron $open={isOpen}>
                  <ChevronRight size={17} />
                </StyledChevron>
                <StyledYearLabel>{year}</StyledYearLabel>
                <BalanceCell cents={lastMonth?.totalLiquid} />
                <BalanceCell cents={lastMonth?.restschuld} />
                <CashflowCell cents={yearCashflow} known={yearKnown} />
              </StyledYearHeader>
              <StyledCountBadge to="/import">
                {count} {count === 1 ? "statement" : "statements"}
              </StyledCountBadge>
            </StyledYearRow>

            {isOpen &&
              months.map((point) => (
                <StyledMonthRow key={point.month} to={`/months/${point.month}`}>
                  <span />
                  <StyledMonthName>
                    {formatMonth(point.month).slice(0, 3)}
                  </StyledMonthName>
                  <StyledNum $tone="pos">
                    <BalanceCell cents={point.totalLiquid} />
                  </StyledNum>
                  <StyledNum $tone="debt">
                    <BalanceCell cents={point.restschuld} />
                  </StyledNum>
                  <StyledNum>
                    <CashflowCell
                      cents={point.netCashflow}
                      known={!isUnknownMonth(point)}
                    />
                  </StyledNum>
                </StyledMonthRow>
              ))}
          </StyledYearSection>
        );
      })}
    </StyledArchive>
  );
}

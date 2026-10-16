import { useState } from "react";
import { ChevronRight } from "lucide-react";
import Money from "../../../primitives/Money/Money";
import { formatMonth } from "../../../utils/format/format";
import { aggregateYearSummaries } from "../../../utils/yearSummaries/yearSummaries";
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
  /** Reconstructed months across the History Span. */
  points: HistoryPoint[];
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

/** Years holding at least one known month, newest first. */
function knownYears(points: HistoryPoint[]): number[] {
  const years = new Set<number>();
  for (const p of points) {
    if (!isUnknownMonth(p)) years.add(Number(p.month.slice(0, 4)));
  }
  return [...years].sort((a, b) => b - a);
}

/**
 * The Year Archive lists every year with at least one known month. Each year
 * summarises its own months — Total Liquid and Restschuld snapshot the last
 * available month (partial-year safe), Net Cashflow is the year's sum — and
 * every month row deep-links into the existing Month Overview.
 */
export default function YearArchive({ points, statementCounts }: Props) {
  // Descending so the newest known year sits on top.
  const orderedYears = knownYears(points);

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
        // Total Liquid / Restschuld snapshot the year's final available month
        // (possibly Unknown); Net Cashflow is the year's sum.
        const [summary] = aggregateYearSummaries<number | null>(months);

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
                <BalanceCell cents={summary?.totalLiquid} />
                <BalanceCell cents={summary?.restschuld} />
                <CashflowCell cents={summary?.netCashflow ?? 0} known />
              </StyledYearHeader>
              {count > 0 && (
                <StyledCountBadge to="/import">
                  {count} {count === 1 ? "statement" : "statements"}
                </StyledCountBadge>
              )}
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

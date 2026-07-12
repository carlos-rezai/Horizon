import { useState } from "react";
import { ChevronRight } from "lucide-react";
import Money from "../../../primitives/Money/Money";
import { aggregateYearSummaries } from "../../../utils/accordion/accordion";
import { formatMonth } from "../../../utils/format/format";
import type { HistoryPoint } from "../historyTypes";
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

  // The accordion aggregator gives us end-of-period Total Liquid / Restschuld
  // (the year's final available month) and the summed Net Cashflow for free.
  const summaries = new Map(
    aggregateYearSummaries(
      points
        .filter((p) => years.includes(Number(p.month.slice(0, 4))))
        .map((p) => ({
          month: p.month,
          totalLiquid: p.totalLiquid,
          restschuld: p.restschuld,
          netCashflow: p.netCashflow,
        }))
    ).map((summary) => [summary.year, summary])
  );

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
        const summary = summaries.get(year);
        const count = statementCounts[year] ?? 0;
        const months = monthsOfYear(points, year);

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
                <Money cents={summary?.totalLiquid ?? 0} />
                <Money cents={summary?.restschuld ?? 0} />
                <Money cents={summary?.netCashflow ?? 0} sign />
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
                    <Money cents={point.totalLiquid} />
                  </StyledNum>
                  <StyledNum $tone="debt">
                    <Money cents={point.restschuld} />
                  </StyledNum>
                  <StyledNum>
                    <Money cents={point.netCashflow} sign />
                  </StyledNum>
                </StyledMonthRow>
              ))}
          </StyledYearSection>
        );
      })}
    </StyledArchive>
  );
}

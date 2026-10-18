import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import Money from "../../../primitives/Money/Money";
import DataRow from "../../../components/DataRow/DataRow";
import TableHeader from "../../../components/TableHeader/TableHeader";
import { formatMonth } from "../../../utils/format/format";
import { aggregateYearSummaries } from "../../../utils/yearSummaries/yearSummaries";
import type { HistoryPoint } from "../../../types/history";
import { isUnknownMonth, knownYears } from "../knownSince/knownSince";
import {
  ARCHIVE_COLUMNS,
  StyledArchive,
  StyledSectionHead,
  StyledSectionTitle,
  StyledYearSection,
  StyledYearRow,
  StyledYearHeader,
  StyledChevron,
  StyledYearLabel,
  StyledCountBadge,
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

      <TableHeader columns={ARCHIVE_COLUMNS} />

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
                forwardedAs="button"
                type="button"
                columns={ARCHIVE_COLUMNS}
                last
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
                <DataRow
                  key={point.month}
                  as={Link}
                  to={`/months/${point.month}`}
                  columns={ARCHIVE_COLUMNS}
                  last
                >
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
                </DataRow>
              ))}
          </StyledYearSection>
        );
      })}
    </StyledArchive>
  );
}

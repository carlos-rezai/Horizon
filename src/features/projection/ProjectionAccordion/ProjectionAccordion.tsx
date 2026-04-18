import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { MonthlySnapshot } from "../../../types/projection";
import type { AccountWithBalance } from "../../../types/account";
import type { RecurringTransaction } from "../../../types/recurring";
import {
  buildAccountColumns,
  findMortgagePayoffMonth,
  deriveSTMonths,
} from "../../../utils/projection";
import { formatBalance, formatMonth } from "../../../utils/format";
import {
  StyledAccordion,
  StyledYearSection,
  StyledYearHeader,
  StyledYearLabel,
  StyledYearMeta,
  StyledChevron,
  StyledTableWrapper,
  StyledTable,
  StyledTh,
  StyledTr,
  StyledTd,
  StyledEmptyState,
  StyledSTBadge,
  StyledPayoffBadge,
} from "./ProjectionAccordion.styles";

interface Props {
  snapshots: MonthlySnapshot[];
  accounts: AccountWithBalance[];
  recurringTransactions?: RecurringTransaction[];
  initialYear?: number;
}

function groupByYear(
  snapshots: MonthlySnapshot[]
): Map<number, MonthlySnapshot[]> {
  const groups = new Map<number, MonthlySnapshot[]>();
  for (const snapshot of snapshots) {
    const year = parseInt(snapshot.month.slice(0, 4), 10);
    if (!groups.has(year)) groups.set(year, []);
    groups.get(year)!.push(snapshot);
  }
  return groups;
}

function getRestschuld(
  snapshot: MonthlySnapshot,
  mortgageIds: string[]
): number | null {
  if (mortgageIds.length === 0) return null;
  return mortgageIds.reduce((sum, id) => {
    const entry = snapshot.accounts[id];
    return sum + (entry?.actual ?? entry?.projected ?? 0);
  }, 0);
}

function getCellValue(
  snapshot: MonthlySnapshot,
  accountId: string
): { value: number | null; isActual: boolean } {
  const entry = snapshot.accounts[accountId];
  if (entry === undefined) return { value: null, isActual: false };
  if (entry.actual !== undefined)
    return { value: entry.actual, isActual: true };
  return { value: entry.projected, isActual: false };
}

export default function ProjectionAccordion({
  snapshots,
  accounts,
  recurringTransactions = [],
  initialYear,
}: Props) {
  const currentYear = new Date().getFullYear();
  const defaultExpanded = initialYear ?? currentYear;

  const [expandedYears, setExpandedYears] = useState<Set<number>>(
    new Set([defaultExpanded])
  );

  if (snapshots.length === 0 || accounts.length === 0) {
    return (
      <StyledEmptyState>
        Add accounts on the dashboard to see your financial plan.
      </StyledEmptyState>
    );
  }

  const columns = buildAccountColumns(accounts);
  const mortgageAccounts = accounts.filter((a) => a.kind === "Mortgage");
  const stMonths = deriveSTMonths(
    recurringTransactions,
    accounts,
    snapshots[0].month,
    snapshots.length
  );
  const mortgageIds = mortgageAccounts.map((a) => a._id);
  const hasMortgage = mortgageIds.length > 0;

  const payoffMonth = hasMortgage
    ? findMortgagePayoffMonth(snapshots, mortgageIds[0])
    : null;
  const payoffYear = payoffMonth ? parseInt(payoffMonth.slice(0, 4), 10) : null;

  const yearGroups = groupByYear(snapshots);

  function toggleYear(year: number) {
    setExpandedYears((prev) => {
      const next = new Set(prev);
      if (next.has(year)) {
        next.delete(year);
      } else {
        next.add(year);
      }
      return next;
    });
  }

  return (
    <StyledAccordion>
      {[...yearGroups.entries()].map(([year, monthSnapshots]) => {
        const isExpanded = expandedYears.has(year);
        const lastSnapshot = monthSnapshots[monthSnapshots.length - 1];
        const summaryRestschuld = getRestschuld(lastSnapshot, mortgageIds);
        const isPayoffYear = payoffYear === year;

        return (
          <StyledYearSection key={year}>
            <StyledYearHeader
              aria-expanded={isExpanded}
              onClick={() => toggleYear(year)}
            >
              <StyledYearLabel>{year}</StyledYearLabel>
              {isPayoffYear && payoffMonth && (
                <StyledPayoffBadge>
                  Paid off {formatMonth(payoffMonth)}
                </StyledPayoffBadge>
              )}
              <StyledYearMeta>
                Liquid {formatBalance(lastSnapshot.totalLiquid)}
              </StyledYearMeta>
              {summaryRestschuld !== null && (
                <StyledYearMeta>
                  RS {formatBalance(summaryRestschuld)}
                </StyledYearMeta>
              )}
              <StyledChevron $expanded={isExpanded}>
                <ChevronDown size={16} />
              </StyledChevron>
            </StyledYearHeader>

            {isExpanded && (
              <StyledTableWrapper>
                <StyledTable>
                  <thead>
                    <tr>
                      <StyledTh>Month</StyledTh>
                      {columns.map((col) => (
                        <StyledTh key={col.id}>{col.name}</StyledTh>
                      ))}
                      {hasMortgage && <StyledTh>Restschuld</StyledTh>}
                      <StyledTh>Net Cashflow</StyledTh>
                      <StyledTh>Total Liquid</StyledTh>
                    </tr>
                  </thead>
                  <tbody>
                    {monthSnapshots.map((snapshot) => {
                      const restschuld = getRestschuld(snapshot, mortgageIds);
                      const monthHasActual = Object.values(
                        snapshot.accounts
                      ).some((a) => a.actual !== undefined);
                      const stAmount = stMonths.get(snapshot.month);
                      const isSTMonth = stAmount !== undefined;
                      const isPayoffMonth = snapshot.month === payoffMonth;

                      return (
                        <StyledTr
                          key={snapshot.month}
                          $isSTMonth={isSTMonth}
                          $isPayoffMonth={isPayoffMonth}
                          data-testid={
                            isPayoffMonth ? "payoff-month-row" : undefined
                          }
                        >
                          <StyledTd>{formatMonth(snapshot.month)}</StyledTd>
                          {columns.map((col) => {
                            const { value, isActual } = getCellValue(
                              snapshot,
                              col.id
                            );
                            return (
                              <StyledTd key={col.id} $isActual={isActual}>
                                {value !== null ? formatBalance(value) : "—"}
                              </StyledTd>
                            );
                          })}
                          {hasMortgage && (
                            <StyledTd>
                              {restschuld !== null
                                ? formatBalance(restschuld)
                                : "—"}
                              {isSTMonth && (
                                <StyledSTBadge>
                                  +{formatBalance(stAmount)}
                                </StyledSTBadge>
                              )}
                            </StyledTd>
                          )}
                          <StyledTd $isActual={monthHasActual}>
                            {formatBalance(snapshot.netCashflow)}
                          </StyledTd>
                          <StyledTd $isActual={monthHasActual}>
                            {formatBalance(snapshot.totalLiquid)}
                          </StyledTd>
                        </StyledTr>
                      );
                    })}
                  </tbody>
                </StyledTable>
              </StyledTableWrapper>
            )}
          </StyledYearSection>
        );
      })}
    </StyledAccordion>
  );
}

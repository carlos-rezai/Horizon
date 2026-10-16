import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ChevronRight, Flag } from "lucide-react";
import type { MonthlySnapshot } from "../../../types/projection";
import type { AccountWithBalance } from "../../../types/account";
import type { RecurringTransaction } from "../../../types/recurring";
import {
  buildAccountColumns,
  findDebtFreeMonth,
  stMonthsFor,
  totalRestschuld,
} from "../../../utils/projection/projection";
import { aggregateYearSummaries } from "../../../utils/yearSummaries/yearSummaries";
import { formatMonth } from "../../../utils/format/format";
import Money from "../../../primitives/Money/Money";
import Chip from "../../../primitives/Chip/Chip";
import {
  StyledAccordion,
  StyledSectionHead,
  StyledSectionTitle,
  StyledLegend,
  StyledLegendDot,
  StyledScroll,
  StyledScrollBody,
  StyledColumnHeader,
  StyledYearSection,
  StyledYearHeader,
  StyledChevron,
  StyledYearLabel,
  StyledMonthRow,
  StyledMonthName,
  StyledNum,
  StyledPayoffFlag,
  StyledDash,
  StyledEmptyState,
} from "./ProjectionAccordion.styles";

interface Props {
  snapshots: MonthlySnapshot[];
  accounts: AccountWithBalance[];
  /** Feeds the ST Month highlight: annual Repayment Transfers before payoff. */
  recurringTransactions: RecurringTransaction[];
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

export default function ProjectionAccordion({
  snapshots,
  accounts,
  recurringTransactions,
  initialYear,
}: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const currentYear = new Date().getFullYear();
  const [expanded, setExpanded] = useState<number | null>(
    initialYear ?? currentYear
  );

  useEffect(() => {
    if (!initialYear) return;
    const el = document.getElementById(`year-${initialYear}`);
    if (el && typeof el.scrollIntoView === "function") {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [initialYear]);

  if (snapshots.length === 0 || accounts.length === 0) {
    return (
      <StyledEmptyState>
        Add accounts on the dashboard to see your financial plan.
      </StyledEmptyState>
    );
  }

  const mortgageIds = accounts
    .filter((a) => a.kind === "Mortgage")
    .map((a) => a.id);
  const hasMortgage = mortgageIds.length > 0;

  const payoffMonth = findDebtFreeMonth(snapshots, mortgageIds);
  const payoffYear = payoffMonth ? parseInt(payoffMonth.slice(0, 4), 10) : null;

  const columns = buildAccountColumns(accounts);
  const accountCount = columns.length;

  const restschuldByMonth = new Map<string, number>();
  snapshots.forEach((s) =>
    restschuldByMonth.set(s.month, totalRestschuld(s, mortgageIds))
  );

  // ST Months: annual Repayment Transfers firing while Restschuld remains.
  const stMonths = stMonthsFor(recurringTransactions, accounts, snapshots);

  const accountBalances = (snapshot: MonthlySnapshot) =>
    Object.fromEntries(
      columns.map((c) => [c.id, snapshot.accounts[c.id]?.projected ?? 0])
    );

  const summaries = aggregateYearSummaries(
    snapshots.map((s) => ({
      month: s.month,
      totalLiquid: s.totalLiquid,
      restschuld: restschuldByMonth.get(s.month) ?? 0,
      netCashflow: s.netCashflow,
      accounts: accountBalances(s),
    }))
  );

  const yearGroups = groupByYear(snapshots);

  function toggleYear(year: number) {
    setExpanded((prev) => (prev === year ? null : year));
  }

  return (
    <StyledAccordion>
      <StyledSectionHead>
        <StyledSectionTitle>Projection</StyledSectionTitle>
        <StyledLegend>
          <StyledLegendDot />
          Payoff year highlighted
        </StyledLegend>
      </StyledSectionHead>

      <StyledScroll>
        <StyledScrollBody>
          <StyledColumnHeader $accountCount={accountCount}>
            <span />
            <span>Period</span>
            {columns.map((column) => (
              <span key={column.id}>
                <Chip color={column.color} size="sm" />
                {column.name}
              </span>
            ))}
            <span>Total Liquid</span>
            <span>Restschuld</span>
          </StyledColumnHeader>

          {summaries.map((summary) => {
            const year = summary.year;
            const isOpen = expanded === year;
            const isPayoffYear = payoffYear === year;
            const months = yearGroups.get(year) ?? [];

            return (
              <StyledYearSection key={year} id={`year-${year}`}>
                <StyledYearHeader
                  type="button"
                  aria-expanded={isOpen}
                  $open={isOpen}
                  $accountCount={accountCount}
                  onClick={() => toggleYear(year)}
                >
                  <StyledChevron $open={isOpen}>
                    <ChevronRight size={17} />
                  </StyledChevron>
                  <StyledYearLabel $payoff={isPayoffYear}>
                    {year}
                  </StyledYearLabel>
                  {columns.map((column) => (
                    <StyledNum key={column.id}>
                      <Money cents={summary.accounts[column.id] ?? 0} />
                    </StyledNum>
                  ))}
                  <StyledNum $tone="pos">
                    <Money cents={summary.totalLiquid} />
                  </StyledNum>
                  {!hasMortgage ? (
                    <StyledDash>—</StyledDash>
                  ) : summary.restschuld > 0 ? (
                    <StyledNum $tone="debt">
                      <Money cents={summary.restschuld} />
                    </StyledNum>
                  ) : (
                    <StyledPayoffFlag>
                      <Flag size={12} />
                      <Money cents={0} />
                    </StyledPayoffFlag>
                  )}
                </StyledYearHeader>

                {isOpen &&
                  months.map((snapshot) => {
                    const restschuld =
                      restschuldByMonth.get(snapshot.month) ?? 0;
                    const isSTMonth = stMonths.has(snapshot.month);
                    const isPayoffMonth = snapshot.month === payoffMonth;

                    return (
                      <StyledMonthRow
                        key={snapshot.month}
                        $isST={isSTMonth}
                        $isPayoff={isPayoffMonth}
                        $accountCount={accountCount}
                        data-st-month={isSTMonth}
                        data-testid={
                          isPayoffMonth ? "payoff-month-row" : "month-row"
                        }
                        onClick={() => {
                          navigate(location.pathname, {
                            replace: true,
                            state: { year },
                          });
                          navigate(`/months/${snapshot.month}`);
                        }}
                      >
                        <span />
                        <StyledMonthName $payoff={isPayoffMonth}>
                          {formatMonth(snapshot.month).slice(0, 3)}
                          {isPayoffMonth && <Flag size={11} />}
                        </StyledMonthName>
                        {columns.map((column) => (
                          <StyledNum key={column.id}>
                            <Money
                              cents={
                                snapshot.accounts[column.id]?.projected ?? 0
                              }
                            />
                          </StyledNum>
                        ))}
                        <StyledNum>
                          <Money cents={snapshot.totalLiquid} />
                        </StyledNum>
                        {!hasMortgage ? (
                          <StyledDash>—</StyledDash>
                        ) : (
                          <StyledNum
                            $tone={restschuld > 0 ? "muted" : "accent"}
                          >
                            <Money cents={restschuld} />
                          </StyledNum>
                        )}
                      </StyledMonthRow>
                    );
                  })}
              </StyledYearSection>
            );
          })}
        </StyledScrollBody>
      </StyledScroll>
    </StyledAccordion>
  );
}

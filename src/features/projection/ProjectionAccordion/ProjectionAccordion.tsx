import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ChevronRight, Flag } from "lucide-react";
import type { MonthlySnapshot } from "../../../types/projection";
import type { AccountWithBalance } from "../../../types/account";
import { findMortgagePayoffMonth } from "../../../utils/projection/projection";
import { aggregateYearSummaries } from "../../../utils/accordion/accordion";
import { formatMonth } from "../../../utils/format/format";
import Money from "../../../primitives/Money/Money";
import {
  StyledAccordion,
  StyledSectionHead,
  StyledSectionTitle,
  StyledLegend,
  StyledLegendDot,
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

// The accordion is a pure projection view (Total Liquid / Restschuld / Net
// Cashflow / Sondertilgung), so it reads the *projected* Restschuld — never the
// actual. A Mortgage's "actual" is just its un-replayed opening balance (ST is
// modelled as a recurring transfer, not an actual transaction), so mixing it in
// would fabricate a phantom step-down at the current-month boundary.
function restschuldOf(
  snapshot: MonthlySnapshot,
  mortgageIds: string[]
): number {
  return mortgageIds.reduce((sum, id) => {
    const entry = snapshot.accounts[id];
    return sum + (entry?.projected ?? 0);
  }, 0);
}

export default function ProjectionAccordion({
  snapshots,
  accounts,
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

  const payoffMonth = hasMortgage
    ? findMortgagePayoffMonth(snapshots, mortgageIds[0])
    : null;
  const payoffYear = payoffMonth ? parseInt(payoffMonth.slice(0, 4), 10) : null;

  // Per-month Restschuld and the Sondertilgung step-down vs. the previous month.
  const restschuldByMonth = new Map<string, number>();
  const stByMonth = new Map<string, number>();
  snapshots.forEach((s, i) => {
    const rs = restschuldOf(s, mortgageIds);
    restschuldByMonth.set(s.month, rs);
    if (i > 0) {
      const step = restschuldOf(snapshots[i - 1], mortgageIds) - rs;
      if (step > 0) stByMonth.set(s.month, step);
    }
  });

  const summaries = aggregateYearSummaries(
    snapshots.map((s) => ({
      month: s.month,
      totalLiquid: s.totalLiquid,
      restschuld: restschuldByMonth.get(s.month) ?? 0,
      netCashflow: s.netCashflow,
    }))
  );

  const yearGroups = groupByYear(snapshots);

  function toggleYear(year: number) {
    setExpanded((prev) => (prev === year ? null : year));
  }

  return (
    <StyledAccordion>
      <StyledSectionHead>
        <StyledSectionTitle>Projection Accordion</StyledSectionTitle>
        <StyledLegend>
          <StyledLegendDot />
          Payoff year highlighted
        </StyledLegend>
      </StyledSectionHead>

      <StyledColumnHeader>
        <span />
        <span>Period</span>
        <span>Total Liquid</span>
        <span>Restschuld</span>
        <span>Net Cashflow</span>
        <span>Sondertilgung</span>
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
              onClick={() => toggleYear(year)}
            >
              <StyledChevron $open={isOpen}>
                <ChevronRight size={17} />
              </StyledChevron>
              <StyledYearLabel $payoff={isPayoffYear}>{year}</StyledYearLabel>
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
              <StyledNum>
                <Money cents={summary.netCashflow} sign />
              </StyledNum>
              {hasMortgage && summary.sondertilgung > 0 ? (
                <StyledNum $tone="muted">
                  <Money cents={-summary.sondertilgung} />
                </StyledNum>
              ) : (
                <StyledDash>—</StyledDash>
              )}
            </StyledYearHeader>

            {isOpen &&
              months.map((snapshot) => {
                const restschuld = restschuldByMonth.get(snapshot.month) ?? 0;
                const stAmount = stByMonth.get(snapshot.month);
                const isSTMonth = stAmount !== undefined;
                const isPayoffMonth = snapshot.month === payoffMonth;

                return (
                  <StyledMonthRow
                    key={snapshot.month}
                    $isST={isSTMonth}
                    $isPayoff={isPayoffMonth}
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
                    <StyledNum>
                      <Money cents={snapshot.totalLiquid} />
                    </StyledNum>
                    {!hasMortgage ? (
                      <StyledDash>—</StyledDash>
                    ) : (
                      <StyledNum $tone={restschuld > 0 ? "muted" : "accent"}>
                        <Money cents={restschuld} />
                      </StyledNum>
                    )}
                    <StyledNum>
                      <Money cents={snapshot.netCashflow} sign />
                    </StyledNum>
                    {hasMortgage && isSTMonth ? (
                      <StyledNum $tone="muted">
                        <Money cents={-stAmount} />
                      </StyledNum>
                    ) : (
                      <StyledDash>—</StyledDash>
                    )}
                  </StyledMonthRow>
                );
              })}
          </StyledYearSection>
        );
      })}
    </StyledAccordion>
  );
}

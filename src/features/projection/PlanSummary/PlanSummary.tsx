import { useNavigate } from "react-router-dom";
import { Flag } from "lucide-react";
import type { MonthlySnapshot } from "../../../types/projection";
import type { AccountWithBalance } from "../../../types/account";
import type { RecurringTransaction } from "../../../types/recurring";
import {
  deriveSTMonths,
  deriveYearSummaries,
} from "../../../utils/projection/projection";
import { formatBalance } from "../../../utils/format/format";
import SectionHead from "../../../components/SectionHead/SectionHead";
import Button from "../../../primitives/Button/Button";
import {
  StyledSection,
  StyledTable,
  StyledTh,
  StyledRow,
  StyledPayoffRow,
  StyledTd,
  StyledYear,
  StyledTotalLiquidAmount,
  StyledRestschuldAmount,
  StyledPayoffFlag,
  StyledSTAmount,
  StyledDash,
  StyledEmptyState,
} from "./PlanSummary.styles";

interface Props {
  snapshots: MonthlySnapshot[];
  accounts: AccountWithBalance[];
  recurringTransactions: RecurringTransaction[];
  maxYears?: number;
}

export default function PlanSummary({
  snapshots,
  accounts,
  recurringTransactions,
  maxYears,
}: Props) {
  const navigate = useNavigate();

  const mortgageIds = accounts
    .filter((a) => a.kind === "Mortgage")
    .map((a) => a.id);
  const hasMortgage = mortgageIds.length > 0;

  const stMonths =
    snapshots.length > 0
      ? deriveSTMonths(
          recurringTransactions,
          accounts,
          snapshots[0].month,
          snapshots.length
        )
      : new Map<string, number>();

  const allRows = deriveYearSummaries(snapshots, mortgageIds, stMonths);
  const rows = maxYears !== undefined ? allRows.slice(0, maxYears) : allRows;

  const payoffYear = rows.find((r) => r.restschuld === 0)?.year ?? null;

  function handleRowClick(year: number) {
    navigate(`/plan#${year}`, { state: { year } });
  }

  return (
    <StyledSection>
      <SectionHead
        label="Outlook"
        title="Plan Summary"
        right={
          <Button
            variant="ghost"
            size="sm"
            iconRight="ArrowRight"
            onClick={() => navigate("/plan")}
          >
            Full plan
          </Button>
        }
      />
      {rows.length === 0 ? (
        <StyledEmptyState>
          Add accounts on the dashboard to see your financial plan.
        </StyledEmptyState>
      ) : (
        <StyledTable>
          <thead>
            <tr>
              <StyledTh>Year</StyledTh>
              <StyledTh>Total Liquid</StyledTh>
              {hasMortgage && <StyledTh>Restschuld</StyledTh>}
              <StyledTh>ST</StyledTh>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const isPayoff = row.year === payoffYear;
              const RowComponent = isPayoff ? StyledPayoffRow : StyledRow;
              return (
                <RowComponent
                  key={row.year}
                  data-testid="year-summary-row"
                  onClick={() => handleRowClick(row.year)}
                >
                  <StyledTd>
                    <StyledYear $payoff={isPayoff}>{row.year}</StyledYear>
                  </StyledTd>
                  <StyledTd>
                    <StyledTotalLiquidAmount>
                      {formatBalance(row.totalLiquid)}
                    </StyledTotalLiquidAmount>
                  </StyledTd>
                  {hasMortgage && (
                    <StyledTd>
                      {row.restschuld === 0 ? (
                        <StyledPayoffFlag>
                          <Flag size={12} />
                          Payoff
                        </StyledPayoffFlag>
                      ) : row.restschuld !== null ? (
                        <StyledRestschuldAmount>
                          {formatBalance(row.restschuld)}
                        </StyledRestschuldAmount>
                      ) : (
                        <StyledDash>—</StyledDash>
                      )}
                    </StyledTd>
                  )}
                  <StyledTd>
                    {row.stAmount ? (
                      <StyledSTAmount>
                        {formatBalance(-Math.abs(row.stAmount))}
                      </StyledSTAmount>
                    ) : (
                      <StyledDash>—</StyledDash>
                    )}
                  </StyledTd>
                </RowComponent>
              );
            })}
          </tbody>
        </StyledTable>
      )}
    </StyledSection>
  );
}

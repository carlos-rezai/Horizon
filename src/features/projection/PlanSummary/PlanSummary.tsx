import { useNavigate } from "react-router-dom";
import type { MonthlySnapshot } from "../../../types/projection";
import type { AccountWithBalance } from "../../../types/account";
import type { RecurringTransaction } from "../../../types/recurring";
import { deriveSTMonths, deriveYearSummaries } from "../../../utils/projection";
import { formatBalance } from "../../../utils/format/format";
import {
  StyledSection,
  StyledViewFullPlan,
  StyledTable,
  StyledTh,
  StyledRow,
  StyledPayoffRow,
  StyledPayoffBadge,
  StyledTd,
  StyledTotalLiquidAmount,
  StyledRestschuldAmount,
  StyledSTAmount,
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
      <StyledViewFullPlan to="/plan">View full plan →</StyledViewFullPlan>
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
              {mortgageIds.length > 0 && <StyledTh>Restschuld</StyledTh>}
              <StyledTh>Savings Rate</StyledTh>
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
                  <StyledTd>{row.year}</StyledTd>
                  <StyledTd>
                    <StyledTotalLiquidAmount>
                      {formatBalance(row.totalLiquid)}
                    </StyledTotalLiquidAmount>
                  </StyledTd>
                  {mortgageIds.length > 0 && (
                    <StyledTd>
                      {row.restschuld !== null ? (
                        <StyledRestschuldAmount>
                          {formatBalance(row.restschuld)}
                        </StyledRestschuldAmount>
                      ) : (
                        "—"
                      )}
                    </StyledTd>
                  )}
                  <StyledTd>
                    {isPayoff ? (
                      <StyledPayoffBadge>PAYOFF</StyledPayoffBadge>
                    ) : row.stAmount !== null ? (
                      <StyledSTAmount>
                        {formatBalance(row.stAmount)}
                      </StyledSTAmount>
                    ) : (
                      "—"
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

import { useNavigate } from "react-router-dom";
import type { MonthlySnapshot } from "../../../types/projection";
import type { AccountWithBalance } from "../../../types/account";
import type { RecurringTransaction } from "../../../types/recurring";
import { deriveSTMonths, deriveYearSummaries } from "../../../utils/projection";
import { formatBalance } from "../../../utils/format";
import Heading from "../../../primitives/Heading/Heading";
import {
  StyledSection,
  StyledTable,
  StyledTh,
  StyledRow,
  StyledTd,
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

  function handleRowClick(year: number) {
    navigate(`/plan#${year}`, { state: { year } });
  }

  return (
    <StyledSection>
      <Heading level={2}>Plan</Heading>
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
              <StyledTh>ST</StyledTh>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <StyledRow
                key={row.year}
                onClick={() => handleRowClick(row.year)}
              >
                <StyledTd>{row.year}</StyledTd>
                <StyledTd>{formatBalance(row.totalLiquid)}</StyledTd>
                {mortgageIds.length > 0 && (
                  <StyledTd>
                    {row.restschuld !== null
                      ? formatBalance(row.restschuld)
                      : "—"}
                  </StyledTd>
                )}
                <StyledTd>
                  {row.stAmount !== null ? (
                    <StyledSTAmount>
                      {formatBalance(row.stAmount)}
                    </StyledSTAmount>
                  ) : (
                    "—"
                  )}
                </StyledTd>
              </StyledRow>
            ))}
          </tbody>
        </StyledTable>
      )}
    </StyledSection>
  );
}

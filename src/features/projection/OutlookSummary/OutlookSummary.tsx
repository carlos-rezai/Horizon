import type { MonthlySnapshot } from "../../../types/projection";
import type { AccountWithBalance } from "../../../types/account";
import type { RecurringTransaction } from "../../../types/recurring";
import StatBlock from "../../../components/StatBlock/StatBlock";
import Money from "../../../primitives/Money/Money";
import { deriveOutlookSummary } from "../../../utils/outlook/outlook";
import { stMonthsFor } from "../../../utils/projection/projection";
import { formatMonth } from "../../../utils/format/format";
import {
  StyledStrip,
  StyledCell,
  StyledBigValue,
  StyledEmpty,
} from "./OutlookSummary.styles";

interface Props {
  snapshots: MonthlySnapshot[];
  accounts: AccountWithBalance[];
  recurringTransactions: RecurringTransaction[];
}

export default function OutlookSummary({
  snapshots,
  accounts,
  recurringTransactions,
}: Props) {
  const mortgageIds = accounts
    .filter((a) => a.kind === "Mortgage")
    .map((a) => a.id);

  const stMonths = stMonthsFor(recurringTransactions, accounts, snapshots);

  const summary = deriveOutlookSummary(snapshots, mortgageIds, stMonths);

  return (
    <StyledStrip data-testid="outlook-summary">
      <StyledCell>
        <StatBlock label={`Total Liquid · ${summary.finalYear}`}>
          <StyledBigValue $tone="pos">
            <Money cents={summary.finalTotalLiquid} />
          </StyledBigValue>
        </StatBlock>
      </StyledCell>
      <StyledCell>
        <StatBlock label="Debt-free" hint="first month with Restschuld 0">
          {summary.debtFreeMonth ? (
            <StyledBigValue $tone="accent">
              {formatMonth(summary.debtFreeMonth)}
            </StyledBigValue>
          ) : (
            <StyledEmpty>—</StyledEmpty>
          )}
        </StatBlock>
      </StyledCell>
      <StyledCell $last>
        <StatBlock
          label="Total Sondertilgung"
          hint={`${summary.sondertilgungCount} annual payments`}
        >
          <StyledBigValue>
            <Money cents={-summary.totalSondertilgung} />
          </StyledBigValue>
        </StatBlock>
      </StyledCell>
    </StyledStrip>
  );
}

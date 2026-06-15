import type { MonthlySnapshot } from "../../../types/projection";
import type { AccountWithBalance } from "../../../types/account";
import StatBlock from "../../../components/StatBlock/StatBlock";
import Money from "../../../primitives/Money/Money";
import {
  deriveOutlookSummary,
  type OutlookPoint,
} from "../../../utils/outlook/outlook";
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
}

export default function OutlookSummary({ snapshots, accounts }: Props) {
  const mortgageIds = accounts
    .filter((a) => a.kind === "Mortgage")
    .map((a) => a.id);

  const points: OutlookPoint[] = snapshots.map((s) => ({
    month: s.month,
    totalLiquid: s.totalLiquid,
    restschuld: mortgageIds.reduce((sum, id) => {
      const entry = s.accounts[id];
      return sum + (entry?.projected ?? 0);
    }, 0),
  }));

  const summary = deriveOutlookSummary(points);

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

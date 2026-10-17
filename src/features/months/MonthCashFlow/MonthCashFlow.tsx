import { Link } from "react-router-dom";
import type { AccountWithBalance } from "../../../types/account";
import type {
  FixedFlow,
  MonthCashFlowReport,
} from "../../../types/monthCashFlow";
import Chip from "../../../primitives/Chip/Chip";
import Badge from "../../../primitives/Badge/Badge";
import Money from "../../../primitives/Money/Money";
import Card from "../../../components/Card/Card";
import SectionHead from "../../../components/SectionHead/SectionHead";
import DataRow from "../../../components/DataRow/DataRow";
import { resolveAccountColor } from "../../../utils/color/color";
import { MONTHS, formatDate, formatMonth } from "../../../utils/format/format";
import {
  netFixed,
  rowAccountId,
  statementHistoryBefore,
} from "../fixedFlows/fixedFlows";
import type { MonthEndBalance } from "../monthEndBalance/monthEndBalance";
import {
  StyledDay,
  StyledDayNum,
  StyledDayMonth,
  StyledDesc,
  StyledAccountLine,
  StyledAccountName,
  StyledEmpty,
} from "../SpendingList/SpendingList.styles";
import {
  ROW_COLUMNS,
  StyledGroups,
  StyledGroupHead,
  StyledGroupName,
  StyledBalance,
  StyledBalanceCaption,
  StyledNet,
  StyledFlowRow,
  StyledAnchorNote,
} from "./MonthCashFlow.styles";

interface Props {
  /** Every account, for the group headers and counterpart names. */
  accounts: AccountWithBalance[];
  report: MonthCashFlowReport;
  /** Full month label (e.g. "September") for the section title. */
  monthLabel: string;
  /** Each group's Month-End Balance, keyed by account id. */
  balances: Record<string, MonthEndBalance>;
}

/**
 * The Month Overview Fixed Flows card: one group per account, in the report's
 * order, listing the month's recurring flows with a "Net fixed" footer.
 * Read-only — each row links to the account page its rule lives on.
 */
export default function MonthCashFlow({
  accounts,
  report,
  monthLabel,
  balances,
}: Props) {
  const byId = new Map(accounts.map((a) => [a.id, a]));

  return (
    <Card>
      <SectionHead label="Fixed Flows" title={`Fixed in ${monthLabel}`} />
      <StyledGroups>
        {report.accounts.map((group) => {
          const account = byId.get(group.accountId);
          const beforeAnchor = statementHistoryBefore(account, report.month);
          return (
            <section key={group.accountId} data-testid="fixed-flow-group">
              <StyledGroupHead data-testid="fixed-flow-group-head">
                {account && <Chip color={resolveAccountColor(account)} />}
                <StyledGroupName>{account?.name ?? "—"}</StyledGroupName>
                <GroupBalance balance={balances[group.accountId]} />
              </StyledGroupHead>

              {beforeAnchor ? (
                <StyledEmpty>
                  Before {formatDate(beforeAnchor)} this account&apos;s history
                  comes from its statements
                </StyledEmpty>
              ) : group.flows.length === 0 ? (
                <StyledEmpty>No fixed flows this month.</StyledEmpty>
              ) : (
                <>
                  <div>
                    {group.flows.map((flow, i) => (
                      <FlowRow
                        key={`${flow.kind === "recurring" ? flow.recurringId : flow.kind}-${flow.date}-${i}`}
                        flow={flow}
                        last={i === group.flows.length - 1}
                        to={`/accounts/${rowAccountId(group, flow)}`}
                        counterpart={
                          flow.counterpartId
                            ? byId.get(flow.counterpartId)
                            : undefined
                        }
                      />
                    ))}
                  </div>
                  <StyledNet data-testid="fixed-flow-net">
                    <span>Net fixed</span>
                    <Money cents={netFixed(group.flows)} sign />
                  </StyledNet>
                </>
              )}
            </section>
          );
        })}
      </StyledGroups>
    </Card>
  );
}

/** The header's Month-End Balance: a figure with its basis, or "No data". */
function GroupBalance({ balance }: { balance: MonthEndBalance | undefined }) {
  if (!balance || balance.basis === "unknown") {
    const knownFrom = balance?.knownFrom;
    return (
      <StyledBalance>
        <StyledBalanceCaption>
          {knownFrom ? `No data before ${formatMonth(knownFrom)}` : "No data"}
        </StyledBalanceCaption>
      </StyledBalance>
    );
  }
  return (
    <StyledBalance>
      <Money cents={balance.cents} />
      <StyledBalanceCaption>
        {balance.basis === "actual"
          ? "Month-end · Actual"
          : "Month-end · Projected"}
      </StyledBalanceCaption>
    </StyledBalance>
  );
}

interface FlowRowProps {
  flow: FixedFlow;
  last: boolean;
  to: string;
  counterpart: AccountWithBalance | undefined;
}

function FlowRow({ flow, last, to, counterpart }: FlowRowProps) {
  const day = parseInt(flow.date.slice(8, 10), 10);
  const monthIdx = parseInt(flow.date.slice(5, 7), 10) - 1;
  return (
    <StyledFlowRow data-testid="fixed-flow-row" $inAnchor={flow.inAnchor}>
      <DataRow as={Link} to={to} columns={ROW_COLUMNS} last={last}>
        <StyledDay>
          <StyledDayNum>{day}</StyledDayNum>
          <StyledDayMonth>{MONTHS[monthIdx]}</StyledDayMonth>
        </StyledDay>
        <div>
          <StyledDesc>{flow.description}</StyledDesc>
          {flow.inAnchor && (
            <StyledAnchorNote>In balance anchor</StyledAnchorNote>
          )}
          {flow.side && (
            <StyledAccountLine data-testid="fixed-flow-counterpart">
              <StyledAccountName>
                {flow.side === "source" ? "→" : "←"}
              </StyledAccountName>
              {counterpart && (
                <Chip color={resolveAccountColor(counterpart)} size="sm" />
              )}
              <StyledAccountName>
                {flow.side === "source"
                  ? (counterpart?.name ?? "—")
                  : `from ${counterpart?.name ?? "—"}`}
              </StyledAccountName>
            </StyledAccountLine>
          )}
        </div>
        {flow.category ? <Badge>{flow.category}</Badge> : <span />}
        <Money cents={flow.amount} sign />
      </DataRow>
    </StyledFlowRow>
  );
}

import { Link } from "react-router-dom";
import type { AccountWithBalance } from "../../../types/account";
import type {
  AccountFixedFlows,
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
import { MONTHS } from "../../../utils/format/format";
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
  StyledNet,
} from "./MonthCashFlow.styles";

interface Props {
  /** Every account, for the group headers and counterpart names. */
  accounts: AccountWithBalance[];
  report: MonthCashFlowReport;
  /** Full month label (e.g. "September") for the section title. */
  monthLabel: string;
}

/** The account whose rule a row comes from: a destination leg's counterpart. */
function sourceAccountId(group: AccountFixedFlows, flow: FixedFlow): string {
  return flow.side === "destination" && flow.counterpartId
    ? flow.counterpartId
    : group.accountId;
}

/**
 * The Month Overview Fixed Flows card: one group per account, in the report's
 * order, listing the month's recurring flows with a "Net fixed" footer.
 * Read-only — each row links to the account page its rule lives on.
 */
export default function MonthCashFlow({ accounts, report, monthLabel }: Props) {
  const byId = new Map(accounts.map((a) => [a.id, a]));

  return (
    <Card>
      <SectionHead label="Fixed Flows" title={`Fixed in ${monthLabel}`} />
      <StyledGroups>
        {report.accounts.map((group) => {
          const account = byId.get(group.accountId);
          const net = group.flows
            .filter((f) => !f.inAnchor)
            .reduce((sum, f) => sum + f.amount, 0);
          return (
            <section key={group.accountId} data-testid="fixed-flow-group">
              <StyledGroupHead data-testid="fixed-flow-group-head">
                {account && <Chip color={resolveAccountColor(account)} />}
                <StyledGroupName>{account?.name ?? "—"}</StyledGroupName>
              </StyledGroupHead>

              {group.flows.length === 0 ? (
                <StyledEmpty>No fixed flows this month.</StyledEmpty>
              ) : (
                <>
                  <div>
                    {group.flows.map((flow, i) => (
                      <FlowRow
                        key={`${flow.recurringId ?? flow.kind}-${flow.date}-${i}`}
                        flow={flow}
                        last={i === group.flows.length - 1}
                        to={`/accounts/${sourceAccountId(group, flow)}`}
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
                    <Money cents={net} sign />
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
    <div data-testid="fixed-flow-row">
      <DataRow as={Link} to={to} columns={ROW_COLUMNS} last={last}>
        <StyledDay>
          <StyledDayNum>{day}</StyledDayNum>
          <StyledDayMonth>{MONTHS[monthIdx]}</StyledDayMonth>
        </StyledDay>
        <div>
          <StyledDesc>{flow.description}</StyledDesc>
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
    </div>
  );
}

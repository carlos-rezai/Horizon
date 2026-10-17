/**
 * Fixed Flows on the client: the Month Overview card's rules about one
 * account's group of rows. The server lists the rows; these rules only read
 * them.
 */
import type { AccountWithBalance } from "../../../types/account";
import type {
  AccountFixedFlows,
  FixedFlow,
} from "../../../types/monthCashFlow";

/** The group's "Net fixed": the sum of its rows not In Balance Anchor. */
export function netFixed(flows: FixedFlow[]): number {
  return flows.filter((f) => !f.inAnchor).reduce((sum, f) => sum + f.amount, 0);
}

/**
 * The account page a row links to. A recurring row links to the account its
 * rule lives on: a destination leg's counterpart. A settlement row links to
 * the CreditCard: the funding account's (source) leg names it as counterpart.
 */
export function rowAccountId(
  group: Pick<AccountFixedFlows, "accountId">,
  flow: FixedFlow
): string {
  const counterpartSide = flow.kind === "settlement" ? "source" : "destination";
  return flow.side === counterpartSide && flow.counterpartId
    ? flow.counterpartId
    : group.accountId;
}

/**
 * The account's Anchor Date when `month` lies before its Anchor month — the
 * month's history then comes from its statements — else `null`.
 */
export function statementHistoryBefore(
  account: Pick<AccountWithBalance, "anchorDate"> | undefined,
  month: string
): string | null {
  const anchorDate = account?.anchorDate;
  return anchorDate && month < anchorDate.slice(0, 7) ? anchorDate : null;
}

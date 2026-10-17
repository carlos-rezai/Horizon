/**
 * Recurring occurrence: the one firing and leg rule every loop shares — the
 * Replay Loop, the Forward Projection, Recurring History and the In Balance
 * Anchor rows. Firing is a pure function of the rule and the month, never of
 * where a run starts. Months are `YYYY-MM`, dates ISO `YYYY-MM-DD`.
 */
import type { AccountKind, Frequency } from "../../storage/types.js";
import { daysInMonth, monthsBetween } from "../date/date.js";

/** Which end of a Recurring Transfer an account is. */
export type TransferSide = "source" | "destination";

export interface FiringRule {
  frequency: Frequency;
  monthOfYear?: number;
}

/**
 * Whether a rule fires in `month`. A rule with a month of year fires in every
 * calendar month of its cycle (annual: that month; quarterly: every third
 * month from it). A legacy rule without one counts its cycle from its source
 * account's Anchor month.
 */
export function firesInMonth(
  rule: FiringRule,
  month: string,
  sourceAnchorMonth: string
): boolean {
  if (rule.frequency === "monthly") return true;
  const period = rule.frequency === "quarterly" ? 3 : 12;

  const distance =
    rule.monthOfYear != null
      ? parseInt(month.slice(5, 7), 10) - rule.monthOfYear
      : monthsBetween(sourceAnchorMonth, month);
  return ((distance % period) + period) % period === 0;
}

/** An occurrence's date: the month's day of month, clamped to its length. */
export function occurrenceDate(month: string, dayOfMonth: number): string {
  const day = Math.min(dayOfMonth, daysInMonth(month));
  return `${month}-${String(day).padStart(2, "0")}`;
}

/**
 * Anchor Gate: a leg moves its account only when dated after the account's
 * Anchor Date — the Anchor Balance already contains it. An account with no
 * anchor lets every leg through.
 */
export function passesAnchorGate(
  anchorDate: string | undefined,
  date: string
): boolean {
  return !anchorDate || date > anchorDate;
}

/** What the leg rule reads of an account: its kind and its Anchor Date. */
export interface LegAccount {
  kind: AccountKind;
  anchorDate?: string;
}

/** What the leg rule reads of a rule: its account, amount and transfer link. */
export interface LegRule {
  accountId: string;
  amount: number;
  linkedAccountId?: string;
}

/**
 * One account's leg of a firing: the signed amount for that account, the
 * counterpart and side for a transfer, and whether the account's Anchor Gate
 * lets it through. A Mortgage destination leg reports the paydown as a
 * positive inflow.
 */
export interface OccurrenceLeg {
  accountId: string;
  amount: number;
  counterpartId?: string;
  side?: TransferSide;
  passesGate: boolean;
}

/**
 * A rule's source account's Anchor month; without an Anchor Date, the run's
 * first month.
 */
export function sourceAnchorMonth(
  rule: Pick<LegRule, "accountId">,
  accountsById: ReadonlyMap<string, LegAccount>,
  runStart: string
): string {
  return accountsById.get(rule.accountId)?.anchorDate?.slice(0, 7) || runStart;
}

/**
 * The legs one firing of `rule` on `date` produces. A plain rule moves its
 * own account, never a Mortgage. A transfer moves the source by `-amount` and
 * the destination by `+amount`; into a Mortgage both legs carry the
 * magnitude, and while the Mortgage's gate is open they are capped at its
 * remaining Restschuld (`restschuldOf`) — a cap of zero yields no legs. Legs
 * the Anchor Gate blocks are returned with `passesGate: false`; applying
 * them is the caller's choice.
 */
export function occurrenceLegs(
  rule: LegRule,
  date: string,
  accountsById: ReadonlyMap<string, LegAccount>,
  restschuldOf: (mortgageId: string) => number
): OccurrenceLeg[] {
  const gate = (id: string): boolean =>
    passesAnchorGate(accountsById.get(id)?.anchorDate, date);
  const sourceMoves = gate(rule.accountId);

  if (!rule.linkedAccountId) {
    if (accountsById.get(rule.accountId)?.kind === "Mortgage") return [];
    return [
      {
        accountId: rule.accountId,
        amount: rule.amount,
        passesGate: sourceMoves,
      },
    ];
  }

  const destId = rule.linkedAccountId;
  const destMoves = gate(destId);
  let magnitude = rule.amount;
  if (accountsById.get(destId)?.kind === "Mortgage") {
    // A repayment stored with the domain's negative outflow sign pays down
    // the Restschuld like a positive one.
    magnitude = Math.abs(rule.amount);
    if (destMoves) magnitude = Math.min(magnitude, restschuldOf(destId));
    if (magnitude <= 0) return [];
  }
  return [
    {
      accountId: rule.accountId,
      amount: -magnitude,
      counterpartId: destId,
      side: "source",
      passesGate: sourceMoves,
    },
    {
      accountId: destId,
      amount: magnitude,
      counterpartId: rule.accountId,
      side: "destination",
      passesGate: destMoves,
    },
  ];
}

/**
 * How a leg changes its account's balance: its amount, except a Mortgage
 * destination leg, whose inflow pays the Restschuld down.
 */
export function legBalanceDelta(
  leg: Pick<OccurrenceLeg, "amount" | "side">,
  kind: AccountKind | undefined
): number {
  return leg.side === "destination" && kind === "Mortgage"
    ? -leg.amount
    : leg.amount;
}

/**
 * Recurring History: the signed sum of an account's recurring legs dated after
 * its Anchor Date, up to and including `through`. Firing, dates, legs and
 * gating come from the recurring-occurrence module; Mortgage legs are capped
 * at the remaining Restschuld, in date order. Amounts are integer cents, dates ISO.
 */
import type { Account, RecurringTransaction } from "../../storage/types.js";
import {
  firesInMonth,
  legBalanceDelta,
  occurrenceDate,
  occurrenceLegs,
  sourceAnchorMonth,
} from "../recurringOccurrence/recurringOccurrence.js";
import { addMonths, monthsBetween } from "../date/date.js";

interface Occurrence {
  rule: RecurringTransaction;
  date: string;
}

export function recurringHistory(
  accountId: string,
  accounts: Account[],
  recurrings: RecurringTransaction[],
  through: string
): number {
  const accountMap = new Map(accounts.map((a) => [a.id, a]));
  const account = accountMap.get(accountId);
  if (!account || recurrings.length === 0) return 0;

  const startMonth = accounts.reduce(
    (earliest, a) => {
      const m = a.anchorDate.slice(0, 7);
      return m < earliest ? m : earliest;
    },
    account.anchorDate.slice(0, 7)
  );
  const endMonth = through.slice(0, 7);

  const occurrences: Occurrence[] = [];
  const length = monthsBetween(startMonth, endMonth);
  for (let i = 0; i <= length; i++) {
    const month = addMonths(startMonth, i);
    for (const rule of recurrings) {
      const anchorMonth = sourceAnchorMonth(rule, accountMap, startMonth);
      if (!firesInMonth(rule, month, anchorMonth)) continue;
      const date = occurrenceDate(month, rule.dayOfMonth);
      if (date > through) continue;
      occurrences.push({ rule, date });
    }
  }
  occurrences.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  // Remaining Restschuld per Mortgage, paid down in date order.
  const restschuld = new Map<string, number>();
  for (const a of accounts) {
    if (a.kind === "Mortgage") restschuld.set(a.id, a.anchorBalance);
  }

  let total = 0;
  for (const { rule, date } of occurrences) {
    const legs = occurrenceLegs(
      rule,
      date,
      accountMap,
      (mortgageId) => restschuld.get(mortgageId) ?? 0
    );
    for (const leg of legs) {
      if (!leg.passesGate) continue;
      const delta = legBalanceDelta(leg, accountMap.get(leg.accountId)?.kind);
      if (restschuld.has(leg.accountId)) {
        restschuld.set(
          leg.accountId,
          (restschuld.get(leg.accountId) ?? 0) + delta
        );
      }
      if (leg.accountId === accountId) total += delta;
    }
  }
  return total;
}

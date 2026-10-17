/**
 * Recurring History: the signed sum of an account's recurring legs dated after
 * its Anchor Date, up to and including `through`. Firing, dates and gating come
 * from the recurring-occurrence module; Mortgage legs are capped at the
 * remaining Restschuld, in date order. Amounts are integer cents, dates ISO.
 */
import type { Account, RecurringTransaction } from "../../storage/types.js";
import {
  firesInMonth,
  occurrenceDate,
  passesAnchorGate,
} from "../recurringOccurrence/recurringOccurrence.js";
import { monthsBetween } from "../date/date.js";

function addMonths(yyyyMM: string, n: number): string {
  const [year, month] = yyyyMM.split("-").map(Number);
  const index = year * 12 + (month - 1) + n;
  const m = String((index % 12) + 1).padStart(2, "0");
  return `${Math.floor(index / 12)}-${m}`;
}

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
      const sourceAnchorMonth =
        accountMap.get(rule.accountId)?.anchorDate.slice(0, 7) ?? startMonth;
      if (!firesInMonth(rule, month, sourceAnchorMonth)) continue;
      const date = occurrenceDate(month, rule.dayOfMonth);
      if (date > through) continue;
      occurrences.push({ rule, date });
    }
  }
  occurrences.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  const gate = (id: string, date: string): boolean =>
    passesAnchorGate(accountMap.get(id)?.anchorDate, date);

  // Remaining Restschuld per Mortgage, paid down in date order.
  const remaining = new Map<string, number>();
  for (const a of accounts) {
    if (a.kind === "Mortgage") remaining.set(a.id, a.anchorBalance);
  }

  let total = 0;
  for (const { rule, date } of occurrences) {
    const sourceMoves = gate(rule.accountId, date);

    if (rule.linkedAccountId) {
      const destId = rule.linkedAccountId;
      const destMoves = gate(destId, date);
      const destKind = accountMap.get(destId)?.kind;

      if (destKind === "Mortgage") {
        let debit = Math.abs(rule.amount);
        if (destMoves) {
          const left = remaining.get(destId) ?? 0;
          debit = Math.min(debit, left);
          remaining.set(destId, left - debit);
          if (destId === accountId) total -= debit;
        }
        if (sourceMoves && rule.accountId === accountId) total -= debit;
        continue;
      }

      if (sourceMoves && rule.accountId === accountId) total -= rule.amount;
      if (destMoves && destId === accountId) total += rule.amount;
      continue;
    }

    if (
      rule.accountId === accountId &&
      account.kind !== "Mortgage" &&
      sourceMoves
    ) {
      total += rule.amount;
    }
  }
  return total;
}

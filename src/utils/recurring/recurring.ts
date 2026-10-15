import type {
  RecurringFrequency,
  RecurringTransaction,
} from "../../types/recurring";

/**
 * How many times a recurring of each frequency fires per month, on average.
 * Annual spreads across 12 months, quarterly across 3, monthly fires fully.
 */
const PER_MONTH_WEIGHT: Record<RecurringFrequency, number> = {
  monthly: 1,
  quarterly: 1 / 3,
  annual: 1 / 12,
};

/**
 * What one recurring does to `accountId`, in signed cents. A plain recurring
 * carries its stored sign on its own account. A Recurring Transfer is stored
 * once, on its source: it reads as −amount there and +amount on its
 * `linkedAccountId` destination, matching the projection engine. Any other
 * account is untouched (0).
 */
export const recurringAmountFor = (
  r: RecurringTransaction,
  accountId: string
): number => {
  if (r.linkedAccountId !== undefined) {
    if (r.accountId === accountId) return -r.amount;
    if (r.linkedAccountId === accountId) return r.amount;
    return 0;
  }
  return r.accountId === accountId ? r.amount : 0;
};

/**
 * The average monthly net of an account's recurring transactions, in signed
 * cents (income positive, expenses negative). Each recurring is weighted by how
 * often it fires per month and summed; the result is rounded to whole cents.
 *
 * Each recurring counts by `recurringAmountFor` — a Recurring Transfer is
 * negative on the account it leaves and positive on its destination.
 */
export const recurringNetPerMonth = (
  recurrings: RecurringTransaction[],
  accountId: string
): number => {
  const total = recurrings.reduce(
    (sum, r) =>
      sum + recurringAmountFor(r, accountId) * PER_MONTH_WEIGHT[r.frequency],
    0
  );
  return Math.round(total);
};

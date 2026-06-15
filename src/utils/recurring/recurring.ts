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
 * The average monthly net of an account's recurring transactions, in signed
 * cents (income positive, expenses negative). Each recurring is weighted by how
 * often it fires per month and summed; the result is rounded to whole cents.
 *
 * Only recurrings that belong to `accountId` count — a Recurring Transfer is
 * counted for the account it leaves, never for its `linkedAccountId` target.
 */
export const recurringNetPerMonth = (
  recurrings: RecurringTransaction[],
  accountId: string
): number => {
  const total = recurrings
    .filter((r) => r.accountId === accountId)
    .reduce((sum, r) => sum + r.amount * PER_MONTH_WEIGHT[r.frequency], 0);
  return Math.round(total);
};

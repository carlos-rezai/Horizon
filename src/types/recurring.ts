export type RecurringFrequency = "monthly" | "quarterly" | "annual";

export interface RecurringTransaction {
  id: string;
  accountId: string;
  amount: number;
  description: string;
  category: string;
  frequency: RecurringFrequency;
  dayOfMonth: number;
  linkedAccountId?: string;
  monthOfYear?: number;
}

/**
 * What the client sends to create or update a recurring — mirrors the
 * server's `RecurringTransactionCreateInput`. A Recurring Transfer is stored
 * on its source `accountId`, with `linkedAccountId` its destination.
 */
export interface RecurringTransactionInput {
  accountId: string;
  amount: number;
  description: string;
  category: string;
  frequency: RecurringFrequency;
  dayOfMonth: number;
  linkedAccountId?: string;
  monthOfYear?: number;
}

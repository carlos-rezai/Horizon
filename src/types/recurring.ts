export type RecurringFrequency = "monthly" | "quarterly" | "annual";

export interface RecurringTransaction {
  id: string;
  accountId: string;
  amount: number;
  description: string;
  category: string;
  frequency: RecurringFrequency;
  dayOfMonth: number;
  isActive: boolean;
  linkedAccountId?: string;
  monthOfYear?: number;
}

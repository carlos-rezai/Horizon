export type AccountKind =
  | "Girokonto"
  | "Tagesgeld"
  | "Mortgage"
  | "CreditCard"
  | "Investment";

export interface Account {
  id: string;
  kind: AccountKind;
  name: string;
  openingBalance: number;
  openingDate: string;
  sondertilgungAllowance?: number;
}

export interface AccountWithBalance extends Account {
  balance: number;
}

export interface AccountCreateInput {
  kind: AccountKind;
  name: string;
  openingBalance: number;
  openingDate: string;
  sondertilgungAllowance?: number;
}

export interface AccountUpdateInput {
  name?: string;
  openingBalance?: number;
  sondertilgungAllowance?: number;
}

export type DeleteResult =
  | { ok: true }
  | { ok: false; reason: "has_transactions" }
  | { ok: false; reason: "is_transfer_leg" }
  | { ok: false; reason: "is_default" }
  | { ok: false; reason: "in_use" };

export interface Category {
  id: string;
  name: string;
  isDefault: boolean;
}

export interface CategoryCreateInput {
  name: string;
}

export interface Milestone {
  id: string;
  name: string;
  accountId: string;
  targetBalance: number;
}

export interface MilestoneCreateInput {
  name: string;
  accountId: string;
  targetBalance: number;
}

export type Frequency = "monthly" | "quarterly" | "annual";

export interface RecurringTransaction {
  id: string;
  accountId: string;
  amount: number;
  description: string;
  category: string;
  frequency: Frequency;
  dayOfMonth: number;
  isActive: boolean;
  linkedAccountId?: string;
  monthOfYear?: number;
}

export interface RecurringTransactionCreateInput {
  accountId: string;
  amount: number;
  description: string;
  category: string;
  frequency: Frequency;
  dayOfMonth: number;
  linkedAccountId?: string;
  monthOfYear?: number;
}

export interface RecurringTransactionUpdateInput {
  amount?: number;
  description?: string;
  category?: string;
  isActive?: boolean;
  frequency?: Frequency;
  dayOfMonth?: number;
  linkedAccountId?: string;
  monthOfYear?: number;
}

export interface Transaction {
  id: string;
  accountId: string;
  date: string;
  amount: number;
  description: string;
  category: string;
  transferId?: string;
  recurringTransactionId?: string;
}

export interface TransactionCreateInput {
  date: string;
  amount: number;
  description: string;
  category: string;
}

export interface TransactionUpdateInput {
  date?: string;
  amount?: number;
  description?: string;
  category?: string;
}

export interface TransferCreateInput {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  date: string;
  description: string;
  category: string;
}

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
  icon?: string | null;
  color?: string | null;
  linkedAccountId?: string | null;
  settlementDay?: number | null;
  linkedSince?: string | null;
  showInTrajectory: boolean;
  originalPrincipal?: number;
  startDate?: string;
  termYears?: number;
}

export interface AccountWithBalance extends Account {
  balance: number;
}

export interface MortgageOriginationInput {
  originalPrincipal: number;
  startDate: string;
  termYears: number;
}

export type SetMortgageOriginationResult =
  | { ok: true; account: Account }
  | { ok: false; reason: "below_restschuld" };

export interface AccountCreateInput {
  kind: AccountKind;
  name: string;
  openingBalance: number;
  openingDate: string;
  sondertilgungAllowance?: number;
  icon?: string | null;
  color?: string | null;
  linkedAccountId?: string | null;
  settlementDay?: number | null;
  showInTrajectory?: boolean;
}

export interface AccountUpdateInput {
  name?: string;
  openingBalance?: number;
  sondertilgungAllowance?: number;
  icon?: string | null;
  color?: string | null;
  linkedAccountId?: string | null;
  settlementDay?: number | null;
  showInTrajectory?: boolean;
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
  color: string;
  hidden: boolean;
}

export interface CategoryCreateInput {
  name: string;
  color?: string;
}

export type CategoryCreateResult =
  | { ok: true; category: Category }
  | { ok: false; reason: "invalid_name" | "collision" };

export type Frequency = "monthly" | "quarterly" | "annual";

export interface RecurringTransaction {
  id: string;
  accountId: string;
  amount: number;
  description: string;
  category: string;
  frequency: Frequency;
  dayOfMonth: number;
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
  isAutoSettlement?: boolean;
  importId?: string;
}

export interface ColumnMapping {
  date: string;
  description: string;
  amount: string;
}

/**
 * A remembered per-bank import preset: the column mapping plus the format
 * quirks the parse engine needs to re-interpret a statement exactly as it was
 * last committed (delimiter, decimal separator, date format). Persisted in
 * `import_presets` so it survives restart, reinstall, and backup/restore.
 */
export interface StoredImportPreset {
  mapping: ColumnMapping;
  delimiter: string;
  decimal: string;
  dateFmt: string;
}

export interface ImportRowInput {
  date: string;
  amount: number;
  description: string;
  category: string;
}

export interface ImportCreateInput {
  accountId: string;
  bank: string;
  filename: string;
  sizeBytes: number;
  rows: ImportRowInput[];
}

export interface ImportRecord {
  id: string;
  accountId: string;
  bank: string;
  filename: string;
  sizeBytes: number;
  rowCount: number;
  startDate: string;
  endDate: string;
  importedAt: string;
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
  isAutoSettlement?: boolean;
}

export type AccountKind =
  | "Girokonto"
  | "Tagesgeld"
  | "Mortgage"
  | "CreditCard"
  | "Investment";

export interface AccountWithBalance {
  id: string;
  kind: AccountKind;
  name: string;
  openingBalance: number;
  openingDate: string;
  balance: number;
  sondertilgungAllowance?: number;
  icon?: string | null;
  color?: string | null;
  linkedAccountId?: string | null;
  settlementDay?: number | null;
  linkedSince?: string | null;
}

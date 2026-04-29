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
  | { ok: false; reason: "has_transactions" };

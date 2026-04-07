export type AccountKind =
  | "Girokonto"
  | "Tagesgeld"
  | "Mortgage"
  | "CreditCard"
  | "Investment";

export interface AccountWithBalance {
  _id: string;
  kind: AccountKind;
  name: string;
  openingBalance: number;
  openingDate: string;
  balance: number;
  sondertilgungAllowance?: number;
}

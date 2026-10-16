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
  anchorBalance: number;
  anchorDate: string;
  balance: number;
  sondertilgungAllowance?: number;
  icon?: string | null;
  color?: string | null;
  linkedAccountId?: string | null;
  settlementDay?: number | null;
  linkedSince?: string | null;
  showInTrajectory?: boolean;
  originalPrincipal?: number;
  startDate?: string;
  termYears?: number;
}

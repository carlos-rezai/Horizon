export interface AccountSnapshot {
  projected: number;
  actual?: number;
}

export interface MonthlySnapshot {
  month: string;
  accounts: Record<string, AccountSnapshot>;
  netCashflow: number;
  totalLiquid: number;
}

export interface YearSummaryRow {
  year: number;
  totalLiquid: number;
  restschuld: number | null;
  stAmount: number | null;
}

export interface TrajectoryDataPoint {
  monthIndex: number;
  label: string;
  totalLiquid: number;
  restschuld: number | null;
  isSTMonth: boolean;
  isPayoffMonth: boolean;
  [accountId: string]: number | null | string | boolean;
}

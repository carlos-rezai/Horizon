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

export interface TrajectoryDataPoint {
  monthIndex: number;
  label: string;
  totalLiquid: number;
  restschuld: number | null;
  isSTMonth: boolean;
  isPayoffMonth: boolean;
  [accountId: string]: number | null | string | boolean;
}

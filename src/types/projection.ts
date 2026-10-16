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

/**
 * A Past Lead-in row: one real past month drawn before the projection on the
 * Trajectory Horizon. Same series keys as `TrajectoryDataPoint`, plus the
 * Paydown Bridge; an Unknown value stays null, never 0.
 */
export interface PastLeadInRow {
  monthIndex: number;
  label: string;
  totalLiquid: number | null;
  restschuld: number | null;
  restschuldBridge: number | null;
  isSTMonth: boolean;
  isPayoffMonth: boolean;
  [accountId: string]: number | null | string | boolean;
}

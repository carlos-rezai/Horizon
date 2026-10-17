import { useMemo } from "react";
import type { AccountWithBalance } from "../../../types/account";
import { currentMonth } from "../../../utils/monthMath/monthMath";
import { useProjection } from "../../projection/useProjection/useProjection";
import { useHistoryPoints } from "../../history/useHistoryPoints/useHistoryPoints";
import {
  monthEndBalance,
  type MonthEndBalance,
} from "../monthEndBalance/monthEndBalance";

interface UseMonthEndBalancesResult {
  /** Each account's Month-End Balance, keyed by account id. */
  balances: Record<string, MonthEndBalance>;
  isLoading: boolean;
  error: string | null;
}

/**
 * The Month-End Balance of every account for `month`: the projection for the
 * current and later months, History for earlier ones. It owns no cache key —
 * both reads go through the hooks that do, so it shares their requests.
 */
export function useMonthEndBalances(
  month: string,
  accounts: Pick<AccountWithBalance, "id">[]
): UseMonthEndBalancesResult {
  const projection = useProjection();
  const history = useHistoryPoints();
  const { snapshots } = projection;
  const { points } = history;

  const balances = useMemo(() => {
    const thisMonth = currentMonth();
    return Object.fromEntries(
      accounts.map((a) => [
        a.id,
        monthEndBalance(month, thisMonth, snapshots, points, a.id),
      ])
    );
  }, [month, accounts, snapshots, points]);

  return {
    balances,
    isLoading: projection.isLoading || history.isLoading,
    error: projection.error ?? history.error,
  };
}

import { useCachedResource } from "../../../components/CacheProvider/useCachedResource";
import { monthCashFlowKey } from "../../../components/CacheProvider/cacheKeys";
import { fetchJson } from "../../../utils/api/fetchJson";
import type { MonthCashFlowReport } from "../../../types/monthCashFlow";

interface UseMonthCashFlowResult {
  report: MonthCashFlowReport | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * The viewed month's cash flow report, read through the app cache: a revisited
 * month paints from cache, then revalidates.
 */
export function useMonthCashFlow(month: string): UseMonthCashFlowResult {
  const { data, isLoading, error } = useCachedResource<MonthCashFlowReport>(
    monthCashFlowKey(month),
    () =>
      fetchJson<MonthCashFlowReport>(`/reports/month-cash-flow?month=${month}`)
  );

  return { report: data ?? null, isLoading, error };
}

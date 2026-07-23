import { useCachedResource } from "../../components/CacheProvider/useCachedResource";
import type { MonthlySnapshot } from "../../types/projection";
import { fetchJson } from "../../utils/api/fetchJson";

interface UseProjectionResult {
  snapshots: MonthlySnapshot[];
  isLoading: boolean;
  error: string | null;
  /** Re-runs the server-side projection and replaces the snapshots. */
  refetch: () => void;
}

/**
 * Stable identity for the not-yet-loaded case, so consumers never see a fresh
 * array on every render.
 */
const NO_SNAPSHOTS: MonthlySnapshot[] = [];

function fetchProjection(): Promise<MonthlySnapshot[]> {
  return fetchJson<MonthlySnapshot[]>("/projection?months=240");
}

export function useProjection(): UseProjectionResult {
  const { data, isLoading, error, refresh } = useCachedResource(
    "projection",
    fetchProjection
  );

  return {
    snapshots: data ?? NO_SNAPSHOTS,
    isLoading,
    error,
    refetch: refresh,
  };
}

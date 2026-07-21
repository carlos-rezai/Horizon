import { useCachedResource } from "../../components/CacheProvider/useCachedResource";
import type { MonthlySnapshot } from "../../types/projection";
import { API_BASE } from "../../utils/api/api";

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

async function fetchProjection(): Promise<MonthlySnapshot[]> {
  const res = await fetch(`${API_BASE}/projection?months=240`);
  if (!res.ok) throw new Error(`Failed to fetch projection: ${res.status}`);
  return (await res.json()) as MonthlySnapshot[];
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

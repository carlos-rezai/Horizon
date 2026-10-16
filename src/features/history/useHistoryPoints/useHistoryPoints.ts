import { HISTORY } from "../../../components/CacheProvider/cacheKeys";
import { useCachedResource } from "../../../components/CacheProvider/useCachedResource";
import type { HistoryPoint } from "../historyTypes/historyTypes";
import { fetchJson } from "../../../utils/api/fetchJson";

interface UseHistoryPointsResult {
  /** Reconstructed months from `GET /projection/history`. */
  points: HistoryPoint[];
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

/**
 * Stable identity for the not-yet-loaded case, so consumers never see a fresh
 * array on every render.
 */
const NO_POINTS: HistoryPoint[] = [];

function fetchHistoryPoints(): Promise<HistoryPoint[]> {
  return fetchJson<HistoryPoint[]>("/projection/history");
}

/**
 * The reconstructed History points. The one owner of the `HISTORY` cache key:
 * every reader goes through this hook, so they all share one request.
 */
export function useHistoryPoints(): UseHistoryPointsResult {
  const { data, isLoading, error, refresh } = useCachedResource(
    HISTORY,
    fetchHistoryPoints
  );

  return { points: data ?? NO_POINTS, isLoading, error, refresh };
}

import { useMemo } from "react";
import { IMPORT_HISTORY } from "../../../components/CacheProvider/cacheKeys";
import { useCachedResource } from "../../../components/CacheProvider/useCachedResource";
import { fetchJson } from "../../../utils/api/fetchJson";
import type { ImportRecord } from "../../import/importTypes/importTypes";
import type { HistoryPoint } from "../../../types/history";
import { useHistoryPoints } from "../useHistoryPoints/useHistoryPoints";

interface UseHistoryResult {
  /** Reconstructed months from `GET /projection/history`. */
  points: HistoryPoint[];
  /** Imported-statement count per year, keyed by the import startDate year. */
  statementCounts: Record<number, number>;
  isLoading: boolean;
  error: Error | null;
}

function fetchImportRecords(): Promise<ImportRecord[]> {
  return fetchJson<ImportRecord[]>("/imports");
}

const NO_POINTS: HistoryPoint[] = [];
const NO_COUNTS: Record<number, number> = {};

/**
 * Loads the reconstructed History points and counts the imported statements
 * per year. Both reads go through the app cache (`HISTORY` via
 * `useHistoryPoints`, and `IMPORT_HISTORY`), so they refresh whenever a
 * mutation bumps either key. A failed request degrades to empty data with a
 * surfaced error.
 */
export function useHistory(): UseHistoryResult {
  const history = useHistoryPoints();
  const imports = useCachedResource(IMPORT_HISTORY, fetchImportRecords);

  const errorMessage = history.error ?? imports.error;
  const error = useMemo(
    () => (errorMessage === null ? null : new Error(errorMessage)),
    [errorMessage]
  );

  const records = imports.data;
  const statementCounts = useMemo(() => {
    if (!records) return NO_COUNTS;
    return records.reduce<Record<number, number>>((counts, record) => {
      const year = Number(record.startDate.slice(0, 4));
      counts[year] = (counts[year] ?? 0) + 1;
      return counts;
    }, {});
  }, [records]);

  if (error) {
    return {
      points: NO_POINTS,
      statementCounts: NO_COUNTS,
      isLoading: false,
      error,
    };
  }

  return {
    points: history.points,
    statementCounts,
    isLoading: history.isLoading || imports.isLoading,
    error: null,
  };
}

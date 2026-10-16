import { useMemo } from "react";
import { IMPORT_HISTORY } from "../../../components/CacheProvider/cacheKeys";
import { useCachedResource } from "../../../components/CacheProvider/useCachedResource";
import { fetchJson } from "../../../utils/api/fetchJson";
import type { ImportRecord } from "../../import/importTypes/importTypes";
import type { HistoryPoint } from "../historyTypes/historyTypes";
import { useHistoryPoints } from "../useHistoryPoints/useHistoryPoints";

interface UseHistoryResult {
  /** Reconstructed months from `GET /projection/history`. */
  points: HistoryPoint[];
  /** Distinct years-with-imports, ascending, derived from import startDates. */
  years: number[];
  /** Imported-statement count per year, keyed by the import startDate year. */
  statementCounts: Record<number, number>;
  isLoading: boolean;
  error: Error | null;
}

function fetchImportRecords(): Promise<ImportRecord[]> {
  return fetchJson<ImportRecord[]>("/imports");
}

const NO_POINTS: HistoryPoint[] = [];
const NO_YEARS: number[] = [];
const NO_COUNTS: Record<number, number> = {};

/**
 * Loads the reconstructed History points and derives the set of years that
 * have imported statements. Both reads go through the app cache (`HISTORY`
 * via `useHistoryPoints`, and `IMPORT_HISTORY`), so they refresh whenever a mutation bumps either
 * key. The years drive which periods the History view may browse; a failed
 * request degrades to empty data with a surfaced error.
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
  const { years, statementCounts } = useMemo(() => {
    if (!records) return { years: NO_YEARS, statementCounts: NO_COUNTS };
    const startYears = records.map((record) =>
      Number(record.startDate.slice(0, 4))
    );
    return {
      years: Array.from(new Set(startYears)).sort((a, b) => a - b),
      statementCounts: startYears.reduce<Record<number, number>>(
        (counts, year) => {
          counts[year] = (counts[year] ?? 0) + 1;
          return counts;
        },
        {}
      ),
    };
  }, [records]);

  if (error) {
    return {
      points: NO_POINTS,
      years: NO_YEARS,
      statementCounts: NO_COUNTS,
      isLoading: false,
      error,
    };
  }

  return {
    points: history.points,
    years,
    statementCounts,
    isLoading: history.isLoading || imports.isLoading,
    error: null,
  };
}

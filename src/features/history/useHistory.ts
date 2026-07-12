import { useState, useEffect } from "react";
import { API_BASE } from "../../utils/api/api";
import type { ImportRecord } from "../import/importTypes";
import type { HistoryPoint } from "./historyTypes";

interface UseHistoryResult {
  /** Reconstructed months from `GET /projection/history`. */
  points: HistoryPoint[];
  /** Distinct years-with-imports, ascending, derived from import startDates. */
  years: number[];
  isLoading: boolean;
  error: Error | null;
}

/**
 * Loads the reconstructed History points and derives the set of years that
 * have imported statements. The years drive which periods the History view may
 * browse; a failed request degrades to empty data with a surfaced error.
 */
export function useHistory(): UseHistoryResult {
  const [points, setPoints] = useState<HistoryPoint[]>([]);
  const [years, setYears] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [historyRes, importsRes] = await Promise.all([
          fetch(`${API_BASE}/projection/history`),
          fetch(`${API_BASE}/imports`),
        ]);
        if (!historyRes.ok || !importsRes.ok) {
          throw new Error("Failed to fetch history");
        }
        const fetchedPoints = (await historyRes.json()) as HistoryPoint[];
        const imports = (await importsRes.json()) as ImportRecord[];
        const derivedYears = Array.from(
          new Set(imports.map((record) => Number(record.startDate.slice(0, 4))))
        ).sort((a, b) => a - b);
        if (!cancelled) {
          setPoints(fetchedPoints);
          setYears(derivedYears);
          setIsLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setPoints([]);
          setYears([]);
          setError(err instanceof Error ? err : new Error(String(err)));
          setIsLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  return { points, years, isLoading, error };
}

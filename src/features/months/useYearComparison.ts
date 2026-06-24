import { useState, useEffect } from "react";
import { API_BASE } from "../../utils/api/api";

export interface YearComparisonRow {
  category: string;
  thisYear: number;
  lastYear: number;
}

interface YearComparisonResponse {
  month: string;
  rows: YearComparisonRow[];
}

interface UseYearComparisonResult {
  rows: YearComparisonRow[];
  isLoading: boolean;
  error: string | null;
}

/**
 * Fetches the Month Overview year-over-year comparison for the viewed month,
 * refetching whenever the month changes. Mirrors `useMonthTransactions`'
 * failure handling: an `ok` guard, a `catch`, and an honest `error` field
 * rather than a spinner stuck forever.
 */
export function useYearComparison(month: string): UseYearComparisonResult {
  const [rows, setRows] = useState<YearComparisonRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (month === "") return;

    let cancelled = false;

    fetch(`${API_BASE}/reports/year-comparison?month=${month}`)
      .then((res) => {
        if (!res.ok)
          throw new Error(`Failed to fetch year comparison: ${res.status}`);
        return res.json() as Promise<YearComparisonResponse>;
      })
      .then((data) => {
        if (!cancelled) {
          setRows(data.rows);
          setIsLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unknown error");
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [month]);

  return { rows, isLoading, error };
}

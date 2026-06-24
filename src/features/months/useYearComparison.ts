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
}

/**
 * Fetches the Month Overview year-over-year comparison for the viewed month,
 * refetching whenever the month changes. Mirrors `useAllMonthTransactions`.
 */
export function useYearComparison(month: string): UseYearComparisonResult {
  const [rows, setRows] = useState<YearComparisonRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (month === "") return;

    let cancelled = false;

    fetch(`${API_BASE}/reports/year-comparison?month=${month}`)
      .then((res) => res.json() as Promise<YearComparisonResponse>)
      .then((data) => {
        if (!cancelled) {
          setRows(data.rows);
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [month]);

  return { rows, isLoading };
}

import { useState, useEffect } from "react";
import { API_BASE } from "../../utils/api/api";
import type { ImportRecord } from "../import/importTypes";

interface UseImportStartDatesResult {
  startDates: string[];
  isLoading: boolean;
}

/**
 * The start dates of every persisted import, used to derive the earliest month
 * the Month Overview picker may browse back to. Failures degrade to an empty
 * list, collapsing the picker to the current month.
 */
export function useImportStartDates(): UseImportStartDatesResult {
  const [startDates, setStartDates] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    fetch(`${API_BASE}/imports`)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to fetch imports: ${res.status}`);
        return res.json() as Promise<ImportRecord[]>;
      })
      .then((records) => {
        if (!cancelled) {
          setStartDates(records.map((record) => record.startDate));
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStartDates([]);
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { startDates, isLoading };
}

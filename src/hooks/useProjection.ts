import { useState, useEffect } from "react";
import type { MonthlySnapshot } from "../types/projection";

interface UseProjectionResult {
  snapshots: MonthlySnapshot[];
  isLoading: boolean;
  error: string | null;
}

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3001";

export function useProjection(): UseProjectionResult {
  const [snapshots, setSnapshots] = useState<MonthlySnapshot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch(`${API_BASE}/projection`)
      .then((res) => {
        if (!res.ok)
          throw new Error(`Failed to fetch projection: ${res.status}`);
        return res.json() as Promise<MonthlySnapshot[]>;
      })
      .then((data) => {
        if (!cancelled) {
          setSnapshots(data);
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
  }, []);

  return { snapshots, isLoading, error };
}

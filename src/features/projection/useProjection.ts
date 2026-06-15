import { useState, useEffect, useCallback } from "react";
import type { MonthlySnapshot } from "../../types/projection";
import { API_BASE } from "../../utils/api/api";

interface UseProjectionResult {
  snapshots: MonthlySnapshot[];
  isLoading: boolean;
  error: string | null;
  /** Re-runs the server-side projection and replaces the snapshots. */
  refetch: () => void;
}

export function useProjection(): UseProjectionResult {
  const [snapshots, setSnapshots] = useState<MonthlySnapshot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const refetch = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;

    fetch(`${API_BASE}/projection?months=240`)
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
  }, [nonce]);

  return { snapshots, isLoading, error, refetch };
}

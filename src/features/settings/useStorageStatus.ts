import { useCallback, useEffect, useState } from "react";
import { API_BASE } from "../../utils/api";

export interface StorageStatus {
  driver: "sqlite" | "mongo";
  schemaVersion: number;
  integrity: string;
  path?: string;
  sizeBytes?: number;
}

interface UseStorageStatusResult {
  status: StorageStatus | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useStorageStatus(): UseStorageStatusResult {
  const [status, setStatus] = useState<StorageStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async (): Promise<void> => {
    try {
      const res = await fetch(`${API_BASE}/storage/status`);
      if (!res.ok) {
        throw new Error(`Failed to fetch storage status: ${res.status}`);
      }
      const data = (await res.json()) as StorageStatus;
      setStatus(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchStatus();
  }, [fetchStatus]);

  return { status, isLoading, error, refetch: fetchStatus };
}

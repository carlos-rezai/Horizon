import { useEffect, useState } from "react";
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
}

export function useStorageStatus(): UseStorageStatusResult {
  const [status, setStatus] = useState<StorageStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch(`${API_BASE}/storage/status`)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to fetch storage status: ${res.status}`);
        }
        return res.json() as Promise<StorageStatus>;
      })
      .then((data) => {
        if (!cancelled) {
          setStatus(data);
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

  return { status, isLoading, error };
}

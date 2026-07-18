import { useCallback, useEffect, useMemo, useState } from "react";
import type { AccountKind, AccountWithBalance } from "../../types/account";
import { API_BASE } from "../../utils/api/api";
import { formatFileSizeKB } from "../../utils/format/format";
import { ImportCommitError, type AttributableIssue } from "./importErrors";
import type {
  CommitImportInput,
  ImportPreview,
  ImportRecord,
  ImportTransactionRecord,
  ImportedStatement,
  ImportedTxn,
} from "./importTypes";

/** Account kinds that can receive imported bank statements. */
const IMPORTABLE_KINDS = new Set<AccountKind>([
  "Girokonto",
  "CreditCard",
  "Tagesgeld",
]);

/** Map a persisted `imports` record onto the UI's grouped-history shape. */
function toStatement(record: ImportRecord): ImportedStatement {
  return {
    id: record.id,
    accountId: record.accountId,
    bank: record.bank,
    filename: record.filename,
    year: Number(record.startDate.slice(0, 4)),
    from: record.startDate,
    to: record.endDate,
    count: record.rowCount,
    importedOn: record.importedAt.slice(0, 10),
    sizeKB: formatFileSizeKB(record.sizeBytes),
    txns: [],
  };
}

interface UseImportResult {
  importAccounts: AccountWithBalance[];
  history: ImportedStatement[];
  isLoading: boolean;
  error: string | null;
  /** Upload a CSV for a stateless parse + detect preview (no writes). */
  preview: (accountId: string, file: File) => Promise<ImportPreview>;
  /** Commit the chosen rows; refreshes history on success. */
  commit: (input: CommitImportInput) => Promise<void>;
  /** Load a past import's persisted transactions for the preview modal. */
  loadTransactions: (importId: string) => Promise<ImportedTxn[]>;
  /** Delete an import and its transactions; refreshes history. */
  remove: (importId: string) => Promise<void>;
}

export function useImport(accounts: AccountWithBalance[]): UseImportResult {
  const [records, setRecords] = useState<ImportRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const importAccounts = useMemo(
    () => accounts.filter((a) => IMPORTABLE_KINDS.has(a.kind)),
    [accounts]
  );

  useEffect(() => {
    let cancelled = false;

    fetch(`${API_BASE}/imports`)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to fetch imports: ${res.status}`);
        return res.json() as Promise<ImportRecord[]>;
      })
      .then((data) => {
        if (!cancelled) {
          setRecords(data);
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
  }, [refreshKey]);

  const history = useMemo(() => records.map(toStatement), [records]);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  const preview = useCallback(
    async (accountId: string, file: File): Promise<ImportPreview> => {
      const body = new FormData();
      body.append("accountId", accountId);
      body.append("file", file);

      const res = await fetch(`${API_BASE}/imports/preview`, {
        method: "POST",
        body,
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(
          data.error ?? `Could not read this file (${res.status})`
        );
      }

      // The server already speaks description/category — the response is the
      // UI preview shape, no field translation needed.
      return (await res.json()) as ImportPreview;
    },
    []
  );

  const commit = useCallback(
    async (input: CommitImportInput): Promise<void> => {
      const res = await fetch(`${API_BASE}/imports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
          issues?: AttributableIssue[];
        };
        throw new ImportCommitError(
          data.error ?? "Failed to import statement",
          data.issues ?? []
        );
      }

      refresh();
    },
    [refresh]
  );

  const loadTransactions = useCallback(
    async (importId: string): Promise<ImportedTxn[]> => {
      const res = await fetch(`${API_BASE}/imports/${importId}/transactions`);
      if (!res.ok) {
        throw new Error(`Failed to load transactions: ${res.status}`);
      }
      // ImportTransactionRecord already carries description/category — the UI
      // shape (ImportedTxn) is a structural subset, so no mapping is needed.
      return (await res.json()) as ImportTransactionRecord[];
    },
    []
  );

  const remove = useCallback(
    async (importId: string): Promise<void> => {
      const res = await fetch(`${API_BASE}/imports/${importId}`, {
        method: "DELETE",
      });
      if (!res.ok && res.status !== 404) {
        throw new Error(`Failed to delete import: ${res.status}`);
      }
      refresh();
    },
    [refresh]
  );

  return {
    importAccounts,
    history,
    isLoading,
    error,
    preview,
    commit,
    loadTransactions,
    remove,
  };
}

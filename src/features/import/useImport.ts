import { useCallback, useEffect, useMemo, useState } from "react";
import type { AccountKind, AccountWithBalance } from "../../types/account";
import { API_BASE } from "../../utils/api/api";
import type {
  CommitImportInput,
  ImportPreview,
  ImportRecord,
  ImportTransactionRecord,
  ImportedStatement,
  ImportedTxn,
  PreviewSummary,
} from "./importTypes";
import type { ParsedImportRow } from "./reviewRows";

/** Account kinds that can receive imported bank statements. */
const IMPORTABLE_KINDS = new Set<AccountKind>([
  "Girokonto",
  "CreditCard",
  "Tagesgeld",
]);

/** A preview row as returned by the server (before UI field renaming). */
interface ServerPreviewRow {
  id: string;
  date: string;
  description: string;
  amount: number;
  category: string;
  duplicate: boolean;
  recurring: boolean;
}

interface ServerPreviewResponse {
  bank: string;
  mapping: { date: string; description: string; amount: string };
  columns: string[];
  rows: ServerPreviewRow[];
  summary: PreviewSummary;
}

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
    sizeKB: Math.max(1, Math.round(record.sizeBytes / 1024)),
    txns: [],
  };
}

function toImportedTxn(record: ImportTransactionRecord): ImportedTxn {
  return {
    id: record.id,
    date: record.date,
    desc: record.description,
    cat: record.category,
    amount: record.amount,
  };
}

function toParsedRow(row: ServerPreviewRow): ParsedImportRow {
  return {
    id: row.id,
    date: row.date,
    desc: row.description,
    amount: row.amount,
    cat: row.category,
    duplicate: row.duplicate,
    recurring: row.recurring,
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

      const data = (await res.json()) as ServerPreviewResponse;
      return {
        bank: data.bank,
        mapping: data.mapping,
        columns: data.columns,
        rows: data.rows.map(toParsedRow),
        summary: data.summary,
      };
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
        };
        throw new Error(data.error ?? "Failed to import statement");
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
      const data = (await res.json()) as ImportTransactionRecord[];
      return data.map(toImportedTxn);
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

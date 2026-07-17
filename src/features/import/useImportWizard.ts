import { useCallback, useEffect, useMemo, useState } from "react";
import type { AccountWithBalance } from "../../types/account";
import type { Category } from "../../types/category";
import type {
  ColumnMapping,
  CommitImportInput,
  ImportPreview,
} from "./importTypes";
import {
  blockersFor,
  buildReviewRows,
  canCommit,
  summarizeReview,
  type ReviewRow,
  type ReviewSummary,
} from "./reviewRows";

interface UseImportWizardParams {
  importAccounts: AccountWithBalance[];
  categories: Category[];
  file: File;
  presetAccountId: string | null;
  preview: (accountId: string, file: File) => Promise<ImportPreview>;
  commit: (input: CommitImportInput) => Promise<void>;
  onClose: () => void;
  /** Fired after a successful commit with the included/skipped split. */
  onDone: (result: {
    account: AccountWithBalance;
    included: number;
    skipped: number;
  }) => void;
}

interface UseImportWizardResult {
  accountId: string;
  account: AccountWithBalance | undefined;
  selectAccount: (id: string) => void;
  data: ImportPreview | null;
  loading: boolean;
  loadError: string | null;
  /** True while a preview is loading or failed — wizard navigation is blocked. */
  blocked: boolean;
  rows: ReviewRow[];
  map: ColumnMapping;
  categoryOptions: string[];
  summary: ReviewSummary;
  /** False while any included row carries a blocker — the commit gate. */
  canCommit: boolean;
  submitting: boolean;
  submitError: string | null;
  toggle: (id: string) => void;
  setCategory: (id: string, category: string) => void;
  setDescription: (id: string, description: string) => void;
  updateMap: (patch: Partial<ColumnMapping>) => void;
  confirm: () => Promise<void>;
}

/**
 * Owns the Import wizard's logic: the target-account selection, the stateless
 * preview-fetch effect, the editable review rows and column mapping, the
 * derived category options and summary, and the commit-payload assembly with
 * its submit lifecycle. The component drives only step navigation and
 * presentation.
 */
export function useImportWizard({
  importAccounts,
  categories,
  file,
  presetAccountId,
  preview,
  commit,
  onClose,
  onDone,
}: UseImportWizardParams): UseImportWizardResult {
  const [accountId, setAccountId] = useState(
    presetAccountId ?? importAccounts[0]?.id ?? ""
  );

  const [data, setData] = useState<ImportPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [map, setMap] = useState<ColumnMapping>({
    date: "",
    description: "",
    amount: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Upload for a fresh parse + detect whenever the target account changes:
  // duplicate/recurring flags are relative to that account. The loading flag
  // is flipped on in selectAccount (and at mount) rather than here, keeping
  // setState out of the synchronous effect body.
  useEffect(() => {
    if (!accountId) return;
    let cancelled = false;

    preview(accountId, file)
      .then((result) => {
        if (cancelled) return;
        setData(result);
        setRows(buildReviewRows(result.rows));
        setMap(result.mapping);
        setLoadError(null);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLoadError(err instanceof Error ? err.message : "Unknown error");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [accountId, file, preview]);

  const selectAccount = useCallback(
    (id: string) => {
      if (id === accountId) return;
      setLoading(true);
      setAccountId(id);
    },
    [accountId]
  );

  const summary = summarizeReview(rows);
  const account =
    importAccounts.find((a) => a.id === accountId) ?? importAccounts[0];

  const categoryOptions = useMemo(() => {
    const names = new Set(categories.map((c) => c.name));
    rows.forEach((r) => names.add(r.category));
    return [...names];
  }, [categories, rows]);

  const toggle = useCallback(
    (id: string) =>
      setRows((rs) =>
        rs.map((r) => (r.id === id ? { ...r, included: !r.included } : r))
      ),
    []
  );

  const setCategory = useCallback(
    (id: string, category: string) =>
      setRows((rs) => rs.map((r) => (r.id === id ? { ...r, category } : r))),
    []
  );

  // Blockers are re-derived from the edited row, never patched: the error state
  // is a function of what the row holds now, so it clears as the user types.
  const setDescription = useCallback(
    (id: string, description: string) =>
      setRows((rs) =>
        rs.map((r) => {
          if (r.id !== id) return r;
          const next = { ...r, description };
          return { ...next, blockers: blockersFor(next) };
        })
      ),
    []
  );

  const updateMap = useCallback(
    (patch: Partial<ColumnMapping>) => setMap((m) => ({ ...m, ...patch })),
    []
  );

  const confirm = useCallback(async () => {
    if (!account || !data) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await commit({
        accountId: account.id,
        bank: data.bank,
        filename: file.name,
        sizeBytes: file.size,
        mapping: map,
        delimiter: data.delimiter,
        decimal: data.decimal,
        dateFmt: data.dateFmt,
        rows: rows
          .filter((r) => r.included)
          .map((r) => ({
            date: r.date,
            amount: r.amount,
            description: r.description,
            category: r.category,
          })),
      });
      onDone({
        account,
        included: summary.included,
        skipped: rows.length - summary.included,
      });
      onClose();
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : "Import failed");
      setSubmitting(false);
    }
  }, [
    account,
    data,
    commit,
    file,
    map,
    rows,
    summary.included,
    onDone,
    onClose,
  ]);

  return {
    accountId,
    account,
    selectAccount,
    data,
    loading,
    loadError,
    blocked: loading || loadError !== null,
    rows,
    map,
    categoryOptions,
    summary,
    canCommit: canCommit(rows),
    submitting,
    submitError,
    toggle,
    setCategory,
    setDescription,
    updateMap,
    confirm,
  };
}

import { randomUUID } from "crypto";
import type {
  ColumnMapping,
  Transaction,
  RecurringTransaction,
} from "../../storage/types.js";
import { detectStatement, mapStatementRows } from "./preview.js";
import { detectDuplicates, detectRecurring } from "./detect.js";
import type { MappedRow } from "./types.js";

/** A previewed row: a normalized row plus its id and detection flags. */
export interface PreviewRow extends MappedRow {
  /** Stable id assigned for this preview so the wizard can track inclusion. */
  id: string;
  duplicate: boolean;
  recurring: boolean;
}

export interface PreviewSummary {
  total: number;
  duplicates: number;
  recurring: number;
}

/** The full stateless-preview payload the wizard renders. */
export interface StatementPreview {
  bank: string;
  mapping: ColumnMapping;
  columns: string[];
  rows: PreviewRow[];
  summary: PreviewSummary;
}

export interface BuildPreviewInput {
  /** Raw uploaded statement bytes. */
  bytes: Uint8Array;
  /** The target account's existing transactions — for duplicate detection. */
  existingTxns: Transaction[];
  /** The target account's recurring transactions — for recurring detection. */
  recurring: RecurringTransaction[];
  /**
   * Look up a bank's remembered column mapping (or null if none saved). The
   * detected bank's mapping is preferred over the freshly-detected default so
   * a past correction is re-applied. Injected so this module stays free of
   * storage — the route backs it with the import-presets repo.
   */
  getRememberedMapping: (bank: string) => Promise<ColumnMapping | null>;
  /** Row-id generator; injectable so tests can assert deterministic ids. */
  generateId?: () => string;
}

/**
 * Orchestrate a stateless import preview: detect the statement, re-apply the
 * bank's remembered mapping if one was saved, map rows to normalized
 * (signed-cents / ISO) form, flag duplicates and recurring matches, assign
 * row ids, and summarise. Pure: all I/O is injected. Propagates
 * `StatementParseError` from {@link detectStatement} for the caller to map.
 */
export async function buildPreview(
  input: BuildPreviewInput
): Promise<StatementPreview> {
  const detected = detectStatement(input.bytes);

  const remembered = await input.getRememberedMapping(detected.bank);
  const mapping = remembered ?? detected.mapping;
  const mappedRows = mapStatementRows(detected, mapping);

  const duplicateFlags = detectDuplicates(mappedRows, input.existingTxns);
  const recurringFlags = detectRecurring(mappedRows, input.recurring);

  const generateId = input.generateId ?? randomUUID;
  const rows: PreviewRow[] = mappedRows.map((row, index) => ({
    id: generateId(),
    ...row,
    duplicate: duplicateFlags[index],
    recurring: recurringFlags[index],
  }));

  return {
    bank: detected.bank,
    mapping,
    columns: detected.columns,
    rows,
    summary: {
      total: rows.length,
      duplicates: duplicateFlags.filter(Boolean).length,
      recurring: recurringFlags.filter(Boolean).length,
    },
  };
}

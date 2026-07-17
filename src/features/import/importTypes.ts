/**
 * Shapes for the Import feature.
 *
 * The backend ("CSV / Bank Statement Import") owns parsing, detection, and
 * persistence; these types describe what crosses the loopback API and the
 * UI-facing shapes the components render. The UI speaks the same
 * `description`/`category` field names as the server end-to-end — no
 * translation layer.
 */
import type { ParsedImportRow } from "./reviewRows";

/** Which raw CSV column feeds each Horizon field (server `ColumnMapping`). */
export interface ColumnMapping {
  date: string;
  description: string;
  amount: string;
}

/** One persisted import record as returned by `GET /imports`. */
export interface ImportRecord {
  id: string;
  accountId: string;
  bank: string;
  filename: string;
  sizeBytes: number;
  rowCount: number;
  startDate: string;
  endDate: string;
  importedAt: string;
}

/** A persisted transaction as returned by `GET /imports/:id/transactions`. */
export interface ImportTransactionRecord {
  id: string;
  accountId: string;
  date: string;
  amount: number;
  description: string;
  category: string;
}

/** A single transaction belonging to an imported statement (UI shape). */
export interface ImportedTxn {
  id: string;
  date: string;
  description: string;
  /** Category key. */
  category: string;
  /** Amount in cents (integer). */
  amount: number;
}

/** One imported bank statement and its parsed transactions (UI shape). */
export interface ImportedStatement {
  id: string;
  accountId: string;
  bank: string;
  filename: string;
  year: number;
  /** ISO date of the first transaction in the statement. */
  from: string;
  /** ISO date of the last transaction in the statement. */
  to: string;
  /** Total transactions in the statement. */
  count: number;
  /** ISO date the statement was imported. */
  importedOn: string;
  sizeKB: number;
  /** Parsed rows for preview; loaded on demand from the server. */
  txns: ImportedTxn[];
}

/** The raw cells of a row the parser rejected — never parsed, never fabricated. */
export interface RejectedSample {
  date: string;
  amount: string;
}

/** Summary counts returned alongside a preview. */
export interface PreviewSummary {
  total: number;
  duplicates: number;
  recurring: number;
  /** Rows flagged as not-yet-settled (pending / "vorgemerkt"). */
  pending: number;
  /**
   * Records with a non-empty date that failed to parse — dropped, not lost.
   * A rejected row never reaches the review table; the samples are the raw
   * cells, which usually diagnose a wrong column mapping rather than bad data.
   */
  rejected: { count: number; samples: RejectedSample[] };
}

/** The `POST /imports/preview` response, with rows mapped to the UI shape. */
export interface ImportPreview {
  bank: string;
  mapping: ColumnMapping;
  /** Effective format the engine applied — echoed back on commit. */
  delimiter: string;
  decimal: string;
  dateFmt: string;
  columns: string[];
  rows: ParsedImportRow[];
  summary: PreviewSummary;
}

/** Payload for committing the chosen rows via `POST /imports`. */
export interface CommitImportInput {
  accountId: string;
  bank: string;
  filename: string;
  sizeBytes: number;
  mapping: ColumnMapping;
  /** The full format to remember for this bank, echoed from the preview. */
  delimiter: string;
  decimal: string;
  dateFmt: string;
  rows: Array<{
    date: string;
    amount: number;
    description: string;
    category: string;
  }>;
}

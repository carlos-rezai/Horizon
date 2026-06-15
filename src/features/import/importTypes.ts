/**
 * Shapes for the Import UI shell.
 *
 * These describe persisted import history and the transactions an imported
 * statement carries. The real records are produced by the deferred "CSV /
 * Bank Statement Import (backend)" epic; the Import UI reads them through the
 * {@link useImport} seam.
 */

/** A single transaction belonging to an imported statement. */
export interface ImportedTxn {
  id: string;
  date: string;
  desc: string;
  /** Category key. */
  cat: string;
  /** Amount in cents (integer). */
  amount: number;
}

/** One imported bank statement and its parsed transactions. */
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
  /** Representative parsed rows for preview. */
  txns: ImportedTxn[];
}

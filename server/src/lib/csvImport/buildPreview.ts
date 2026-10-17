import { randomUUID } from "crypto";
import type {
  Category,
  ColumnMapping,
  StoredImportPreset,
  Transaction,
  RecurringTransaction,
} from "../../storage/types.js";
import {
  detectStatement,
  mapStatementRows,
  type RejectedSample,
} from "./detectStatement.js";
import { detectDuplicates, detectRecurring } from "./flagRows.js";
import { categorizeRow } from "./categorizeRow.js";
import type { CategorySource, MappedRow } from "./types.js";

/** A stored Category Rule, as far as the preview needs it. */
export interface PreviewCategoryRule {
  counterpartyKey: string;
  category: string;
}

/** A previewed row: a normalized row plus its id and detection flags. */
export interface PreviewRow extends MappedRow {
  /** Stable id assigned for this preview so the wizard can track inclusion. */
  id: string;
  category: string;
  /**
   * Why the row carries its category — `learned` from a Category Rule,
   * `suggested` from a Keyword Group, `proposed` when the group's category
   * does not exist yet, else `unmatched`.
   */
  categorySource: CategorySource;
  /** A Category Proposal's canonical name — present only when `proposed`. */
  proposedCategory?: string;
  duplicate: boolean;
  recurring: boolean;
}

export interface PreviewSummary {
  total: number;
  duplicates: number;
  recurring: number;
  /** Rows flagged as not-yet-settled (pending / "vorgemerkt"). */
  pending: number;
  /**
   * Records with a non-empty date that failed to parse — dropped, not lost.
   * The samples are the raw cells, which usually diagnose a wrong mapping.
   */
  rejected: { count: number; samples: RejectedSample[] };
}

/** The full stateless-preview payload the wizard renders. */
export interface StatementPreview {
  bank: string;
  mapping: ColumnMapping;
  /** Effective format applied to the rows — echoed back on commit so the
   * remembered preset round-trips the full format, not just the column map. */
  delimiter: string;
  decimal: string;
  dateFmt: string;
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
   * The target account's Anchor Date (ISO), for recurring detection. Absent
   * when the target account is unknown — every row is then checked as before.
   */
  anchorDate?: string;
  /** Every stored Category Rule, applied by Counterparty Key. */
  categoryRules?: PreviewCategoryRule[];
  /**
   * The user's categories. A rule applies only while its category exists
   * (hidden or not), so a stale rule never lands a row in a missing category.
   */
  categories?: Category[];
  /** Canonical names the user declined as Category Proposals. */
  declinedProposals?: string[];
  /**
   * Look up a bank's remembered preset (or null if none saved). A remembered
   * mapping and format are preferred over the freshly-detected defaults so a
   * past correction is re-applied. Injected so this module stays free of
   * storage — the route backs it with the import-presets repo.
   */
  getRememberedPreset: (bank: string) => Promise<StoredImportPreset | null>;
  /**
   * A column mapping the user corrected in the Map-columns step. Wins over both
   * the remembered preset and the detected default so the correction re-maps the
   * very rows being reviewed. Precedence: override ?? remembered ?? detected.
   */
  mappingOverride?: ColumnMapping;
  /** Row-id generator; injectable so tests can assert deterministic ids. */
  generateId?: () => string;
}

/**
 * Orchestrate a stateless import preview: detect the statement, re-apply the
 * bank's remembered mapping if one was saved, map rows to normalized
 * (signed-cents / ISO) form, categorize each row (Category Rule, then
 * Keyword Group, else Miscellaneous), flag duplicates and recurring matches, assign
 * row ids, and summarise. Pure: all I/O is injected. Propagates
 * `StatementParseError` from {@link detectStatement} for the caller to map.
 */
export async function buildPreview(
  input: BuildPreviewInput
): Promise<StatementPreview> {
  const detected = detectStatement(input.bytes);

  // Prefer the remembered mapping and format over the freshly-detected
  // defaults, so a past correction (column map, decimal, date format) is
  // re-applied. The delimiter governs splitting, which detection already owns,
  // so it is remembered for round-trip completeness but not re-applied here.
  const remembered = await input.getRememberedPreset(detected.bank);
  const mapping =
    input.mappingOverride ?? remembered?.mapping ?? detected.mapping;
  const delimiter = remembered?.delimiter ?? detected.delimiter;
  const decimal = remembered?.decimal ?? detected.decimal;
  const dateFmt = remembered?.dateFmt ?? detected.dateFmt;

  const { rows: mappedRows, rejected } = mapStatementRows(
    { ...detected, decimal, dateFmt },
    mapping
  );

  const duplicateFlags = detectDuplicates(mappedRows, input.existingTxns);
  const recurringFlags = detectRecurring(
    mappedRows,
    input.recurring,
    input.anchorDate
  );

  const existing = new Set((input.categories ?? []).map((c) => c.name));
  const rules = new Map(
    (input.categoryRules ?? [])
      .filter((rule) => existing.has(rule.category))
      .map((rule) => [rule.counterpartyKey, rule.category])
  );

  const generateId = input.generateId ?? randomUUID;
  const context = {
    rules,
    categories: input.categories ?? [],
    declined: new Set(input.declinedProposals ?? []),
  };
  const rows: PreviewRow[] = mappedRows.map((row, index) => {
    const { category, categorySource, proposedCategory } = categorizeRow(
      row,
      context
    );
    return {
      id: generateId(),
      ...row,
      category,
      categorySource,
      ...(proposedCategory === undefined ? {} : { proposedCategory }),
      duplicate: duplicateFlags[index],
      recurring: recurringFlags[index],
    };
  });

  return {
    bank: detected.bank,
    mapping,
    delimiter,
    decimal,
    dateFmt,
    columns: detected.columns,
    rows,
    summary: {
      total: rows.length,
      duplicates: duplicateFlags.filter(Boolean).length,
      recurring: recurringFlags.filter(Boolean).length,
      pending: rows.filter((row) => row.pending).length,
      rejected,
    },
  };
}

/**
 * Statement/bank detection: locate the bank (or fall back to generic), choose
 * the encoding via a signature-driven retry, map the rows, and enforce the hard
 * caps. This is the statement-level engine; the per-row flagging against account
 * history lives in `flagRows.ts`, and the preview orchestrator that composes
 * both is `buildPreview.ts`.
 */
import type { ColumnMapping } from "../../storage/types.js";
import { BANK_PRESETS, DEFAULT_BANK } from "./bankPresets.js";
import {
  parseStatement,
  tryParseAmount,
  tryParseDate,
  splitRecords,
  buildRecord,
  dedupeHeader,
} from "./parse.js";
import { categorize } from "./categorize.js";
import type { MappedRow } from "./types.js";

/**
 * Hard caps enforced at parse time. A statement that exceeds either is
 * rejected outright — never silently truncated — so the user always commits
 * exactly what they saw.
 */
export const MAX_ROWS = 10000;
export const MAX_COLUMNS = 50;

/** Defaults for an unrecognised statement (the German banks' conventions). */
const GENERIC_DELIMITER = ";";
const GENERIC_DECIMAL = ",";
const GENERIC_DATE_FMT = "DD.MM.YYYY";

/**
 * Thrown when a file can't be parsed into a statement — unreadable bytes, no
 * locatable header, or a row/column count past the hard caps. The route maps
 * every instance to a 422 with a clear message.
 */
export class StatementParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StatementParseError";
  }
}

/** A located statement: its header, data rows, and how to interpret them. */
export interface DetectedStatement {
  bank: string;
  columns: string[];
  records: Array<Record<string, string>>;
  /** Best-guess mapping the user can adjust in the wizard. */
  mapping: ColumnMapping;
  delimiter: string;
  decimal: string;
  dateFmt: string;
  /** Column marking a pending booking (carried from the preset, if any). */
  pendingColumn?: string;
  /** Cell values in {@link pendingColumn} that mean the row is pending. */
  pendingValues?: string[];
}

/** Try each known bank preset; the first whose header signature is found wins. */
function locateKnownBank(text: string): DetectedStatement | null {
  for (const [bank, preset] of Object.entries(BANK_PRESETS)) {
    const parsed = parseStatement(text, preset);
    if (parsed.columns.length > 0) {
      return {
        bank,
        columns: parsed.columns,
        records: parsed.rows,
        mapping: preset.map,
        delimiter: preset.delimiter,
        decimal: preset.decimal,
        dateFmt: preset.dateFmt,
        pendingColumn: preset.pendingColumn,
        pendingValues: preset.pendingValues,
      };
    }
  }
  return null;
}

const DATE_PATTERN = /datum|buchung|date|valuta/i;
const AMOUNT_PATTERN = /betrag|amount|umsatz|wert/i;
const DESCRIPTION_PATTERN =
  /verwendung|zweck|beschreib|description|empf|begünst|auftrag|text/i;

function findColumn(columns: string[], pattern: RegExp): string | undefined {
  return columns.find((column) => pattern.test(column));
}

/**
 * Fallback for an unmatched bank: treat the first non-empty record as the
 * header and infer a date/description/amount mapping by column-name keyword.
 * The wizard lets the user correct it.
 */
function locateGeneric(text: string): DetectedStatement {
  const records = splitRecords(text, GENERIC_DELIMITER).filter((record) =>
    record.some((field) => field.trim().length > 0)
  );
  if (records.length === 0) {
    throw new StatementParseError("No rows found in file.");
  }

  // De-duplicate the header exactly as the known-bank path does, so an unknown
  // bank shipping two identically-named columns addresses distinct cells rather
  // than collapsing the second onto the first.
  const columns = dedupeHeader(records[0]);
  if (columns.length > MAX_COLUMNS) {
    throw new StatementParseError(`Too many columns (max ${MAX_COLUMNS}).`);
  }

  const date = findColumn(columns, DATE_PATTERN);
  const description = findColumn(columns, DESCRIPTION_PATTERN);
  const amount = findColumn(columns, AMOUNT_PATTERN);
  if (!date || !description || !amount) {
    throw new StatementParseError(
      "Could not locate date, description, and amount columns."
    );
  }

  const dataRecords = records
    .slice(1)
    .map((record) => buildRecord(columns, record));

  return {
    bank: DEFAULT_BANK,
    columns,
    records: dataRecords,
    mapping: { date, description, amount },
    delimiter: GENERIC_DELIMITER,
    decimal: GENERIC_DECIMAL,
    dateFmt: GENERIC_DATE_FMT,
  };
}

const UTF8_BOM = [0xef, 0xbb, 0xbf] as const;

/** True when the bytes open with a UTF-8 BOM — an authoritative UTF-8 claim. */
function hasUtf8Bom(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 3 &&
    bytes[0] === UTF8_BOM[0] &&
    bytes[1] === UTF8_BOM[1] &&
    bytes[2] === UTF8_BOM[2]
  );
}

/**
 * A located known bank decoded correctly when its full mapping — the
 * date/description/amount columns, which for the German banks carry the umlaut
 * header cell — survived the decode intact. A mojibake (`BegÃ¼nstigter`) or
 * corrupted (`Beg�nstigter`) decode still matches the ASCII header
 * signature but loses the umlaut column, so the mapping is the oracle that the
 * chosen encoding is the right one.
 */
function decodedCleanly(detected: DetectedStatement): boolean {
  return Object.values(detected.mapping).every((column) =>
    detected.columns.includes(column)
  );
}

/**
 * Resolve the statement's text and located header, choosing the encoding via a
 * signature-driven retry. A UTF-8 BOM is authoritative → UTF-8. Otherwise the
 * bytes are decoded under both Windows-1252 and UTF-8 and the first decode that
 * surfaces a cleanly-decoded known bank wins (the umlaut header is the oracle);
 * if neither matches a known bank, the generic fallback is located under
 * Windows-1252.
 */
function locateStatement(bytes: Uint8Array): DetectedStatement {
  if (hasUtf8Bom(bytes)) {
    const text = new TextDecoder("utf-8").decode(bytes);
    return locateKnownBank(text) ?? locateGeneric(text);
  }

  for (const encoding of ["windows-1252", "utf-8"]) {
    const text = new TextDecoder(encoding).decode(bytes);
    const known = locateKnownBank(text);
    if (known && decodedCleanly(known)) {
      return known;
    }
  }

  const fallbackText = new TextDecoder("windows-1252").decode(bytes);
  return locateGeneric(fallbackText);
}

/**
 * Decode the raw bytes with a signature-driven encoding retry, locate the
 * header (known preset or generic fallback), and enforce the hard caps. Pure:
 * no I/O, no DB.
 */
export function detectStatement(bytes: Uint8Array): DetectedStatement {
  const detected = locateStatement(bytes);

  if (detected.columns.length > MAX_COLUMNS) {
    throw new StatementParseError(`Too many columns (max ${MAX_COLUMNS}).`);
  }
  if (detected.records.length > MAX_ROWS) {
    throw new StatementParseError(`Too many rows (max ${MAX_ROWS}).`);
  }

  return detected;
}

/**
 * How many rejected records are kept as evidence. A wholly-wrong mapping
 * rejects every row in the file, and none of those 10,000 belong in the
 * payload — a handful is enough to read the mapping off.
 */
export const MAX_REJECTED_SAMPLES = 5;

/** The raw cells of a rejected record — never parsed, never fabricated. */
export interface RejectedSample {
  date: string;
  amount: string;
}

/** The emitted rows plus the records that failed to parse. */
export interface MappedRows {
  rows: MappedRow[];
  /**
   * Records with a non-empty date that failed date/amount parsing. Surfaced as
   * a count so the user knows a row was dropped — never silently lost — plus
   * the first few raw cells, which usually diagnose a wrong column mapping.
   */
  rejected: { count: number; samples: RejectedSample[] };
}

/** True when the record's pendingColumn cell is one of the preset's pendingValues. */
function isPending(
  record: Record<string, string>,
  detected: DetectedStatement
): boolean {
  if (!detected.pendingColumn || !detected.pendingValues) {
    return false;
  }
  return detected.pendingValues.includes(record[detected.pendingColumn] ?? "");
}

/**
 * Turn detected records into normalized rows under the given mapping:
 * signed-cents amounts, ISO dates, an auto-assigned category, and a pending
 * flag. Records with an empty date cell are dropped silently (blank lines,
 * balance-footer rows); a record with a non-empty date that fails date/amount
 * parsing is counted as `rejected`, sampled up to {@link MAX_REJECTED_SAMPLES},
 * and never emitted.
 */
export function mapStatementRows(
  detected: DetectedStatement,
  mapping: ColumnMapping
): MappedRows {
  const rows: MappedRow[] = [];
  let rejectedCount = 0;
  const samples: RejectedSample[] = [];

  for (const record of detected.records) {
    const rawDate = record[mapping.date] ?? "";
    if (rawDate.trim().length === 0) {
      // A dateless record is a blank line or a balance footer — not a
      // transaction and not an error, so drop it without counting.
      continue;
    }

    const rawAmount = record[mapping.amount] ?? "";
    const date = tryParseDate(rawDate, detected.dateFmt);
    const amount = tryParseAmount(rawAmount, detected.decimal);
    if (date === null || amount === null) {
      rejectedCount += 1;
      // The cells are kept exactly as they appeared: reading them against the
      // mapping is how the user sees which column is wrong.
      if (samples.length < MAX_REJECTED_SAMPLES) {
        samples.push({ date: rawDate, amount: rawAmount });
      }
      continue;
    }

    const description = record[mapping.description] ?? "";
    rows.push({
      date,
      description,
      amount,
      category: categorize(description),
      pending: isPending(record, detected),
    });
  }

  return { rows, rejected: { count: rejectedCount, samples } };
}

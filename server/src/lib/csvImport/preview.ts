import type { ColumnMapping } from "../../storage/types.js";
import { BANK_PRESETS, DEFAULT_BANK } from "./bankPresets.js";
import {
  detectEncoding,
  parseStatement,
  parseAmount,
  parseDate,
  splitRecords,
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

  const columns = records[0];
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

  const dataRecords = records.slice(1).map((record) => {
    const mapped: Record<string, string> = {};
    columns.forEach((column, index) => {
      mapped[column] = record[index] ?? "";
    });
    return mapped;
  });

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

/**
 * Sniff the encoding, decode the raw bytes, locate the header (known preset or
 * generic fallback), and enforce the hard caps. Pure: no I/O, no DB.
 */
export function detectStatement(bytes: Uint8Array): DetectedStatement {
  const encoding = detectEncoding(bytes);
  const text = new TextDecoder(encoding).decode(bytes);

  const detected = locateKnownBank(text) ?? locateGeneric(text);

  if (detected.columns.length > MAX_COLUMNS) {
    throw new StatementParseError(`Too many columns (max ${MAX_COLUMNS}).`);
  }
  if (detected.records.length > MAX_ROWS) {
    throw new StatementParseError(`Too many rows (max ${MAX_ROWS}).`);
  }

  return detected;
}

/**
 * Turn detected records into normalized rows under the given mapping:
 * signed-cents amounts, ISO dates, and an auto-assigned category.
 */
export function mapStatementRows(
  detected: DetectedStatement,
  mapping: ColumnMapping
): MappedRow[] {
  return detected.records.map((record) => {
    const description = record[mapping.description] ?? "";
    return {
      date: parseDate(record[mapping.date] ?? "", detected.dateFmt),
      description,
      amount: parseAmount(record[mapping.amount] ?? "", detected.decimal),
      category: categorize(description),
    };
  });
}

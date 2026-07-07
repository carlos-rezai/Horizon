import type { BankPreset } from "./bankPresets.js";

/** A parsed statement: the located header row and its mapped data rows. */
export interface ParsedStatement {
  columns: string[];
  rows: Array<Record<string, string>>;
}

/**
 * Quote-aware (RFC-4180) split of CSV text into rows of fields. Honors the
 * given delimiter, doubled `""` escapes inside quotes, and CRLF or LF line
 * endings.
 */
export function splitRecords(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let started = false;

  const pushField = (): void => {
    row.push(field);
    field = "";
  };
  const pushRow = (): void => {
    pushField();
    rows.push(row);
    row = [];
    started = false;
  };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      started = true;
    } else if (ch === delimiter) {
      pushField();
      started = true;
    } else if (ch === "\r") {
      // swallow; the \n that follows ends the record
    } else if (ch === "\n") {
      pushRow();
    } else {
      field += ch;
      started = true;
    }
  }

  if (started || field.length > 0 || row.length > 0) {
    pushRow();
  }
  return rows;
}

/** True when every signature field appears in the candidate row. */
function isHeaderRow(row: string[], signature: string[]): boolean {
  return signature.every((field) => row.includes(field));
}

/**
 * De-duplicate a header row so a bank that ships two columns with the same
 * literal name (Postbank credit-card exports carry two `Betrag` cells — the
 * foreign-currency figure and the EUR figure) yields distinct, addressable
 * names. The first occurrence keeps its bare name; the n-th duplicate (n >= 2)
 * becomes `X (n)`, so rows keyed by these names never overwrite one another.
 */
function dedupeHeader(header: string[]): string[] {
  const seen = new Map<string, number>();
  return header.map((name) => {
    const count = (seen.get(name) ?? 0) + 1;
    seen.set(name, count);
    return count === 1 ? name : `${name} (${count})`;
  });
}

/**
 * Parse a statement: scan past any metadata preamble to the header row
 * identified by the preset's `headerSignature`, then return that header and
 * each subsequent row mapped by column name. Quote-aware with the preset's
 * delimiter.
 */
export function parseStatement(
  text: string,
  preset: BankPreset
): ParsedStatement {
  const records = splitRecords(text, preset.delimiter);
  const headerIndex = records.findIndex((row) =>
    isHeaderRow(row, preset.headerSignature)
  );
  if (headerIndex === -1) {
    return { columns: [], rows: [] };
  }

  const columns = dedupeHeader(records[headerIndex]);
  const rows = records.slice(headerIndex + 1).map((record) => {
    const mapped: Record<string, string> = {};
    columns.forEach((column, index) => {
      mapped[column] = record[index] ?? "";
    });
    return mapped;
  });

  return { columns, rows };
}

/**
 * Parse a localized amount string into exact integer cents. Strips the
 * thousands separator (the opposite of `decimal`) and works on the integer and
 * fractional parts separately so there is no floating-point error.
 */
export function parseAmount(str: string, decimal: string): number {
  const negative = str.trim().startsWith("-");
  const thousands = decimal === "," ? "." : ",";
  const digits = str
    .replace(/[^0-9.,]/g, "")
    .split(thousands)
    .join("");
  const [intPart = "0", fracPart = ""] = digits.split(decimal);
  const fraction = (fracPart + "00").slice(0, 2);
  const cents =
    parseInt(intPart || "0", 10) * 100 + parseInt(fraction || "0", 10);
  return negative ? -cents : cents;
}

/**
 * Parse an amount, returning `null` when the cell carries no digits at all
 * (junk like "keine Zahl"). Lets the mapper count an unparseable row as
 * rejected rather than silently coercing it to 0.
 */
export function tryParseAmount(str: string, decimal: string): number | null {
  return /\d/.test(str) ? parseAmount(str, decimal) : null;
}

/** A well-formed ISO date the mapper emits. */
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Parse a date, returning `null` when the source cell doesn't yield a
 * well-formed ISO date (junk like "not-a-date"). Lets the mapper count an
 * unparseable row as rejected rather than emitting a garbage date.
 */
export function tryParseDate(str: string, dateFmt: string): string | null {
  const iso = parseDate(str, dateFmt);
  return ISO_DATE.test(iso) ? iso : null;
}

/**
 * Convert a date string to an ISO (`YYYY-MM-DD`) date string given its source
 * format (e.g. `DD.MM.YYYY` or `DD.MM.YY`). A 2-digit `YY` year is expanded
 * unconditionally to `20YY` (bank statements are always current, so there is
 * no pivot window); a 4-digit `YYYY` year passes through unchanged. A
 * single-digit day or month (`D.M.YYYY`, e.g. Postbank's `1.9.2026`) is
 * zero-padded to two digits so the emitted date is always well-formed ISO.
 */
export function parseDate(str: string, dateFmt: string): string {
  const separator = dateFmt.includes(".")
    ? "."
    : dateFmt.includes("/")
      ? "/"
      : "-";
  const formatTokens = dateFmt.split(separator);
  const valueParts = str.split(separator);
  const parts: Record<string, string> = {};
  formatTokens.forEach((token, index) => {
    parts[token] = valueParts[index] ?? "";
  });
  const day = (parts.DD ?? "").padStart(2, "0");
  const month = (parts.MM ?? "").padStart(2, "0");
  const year =
    parts.YYYY ?? (parts.YY !== undefined ? `20${parts.YY}` : undefined);
  return `${year}-${month}-${day}`;
}

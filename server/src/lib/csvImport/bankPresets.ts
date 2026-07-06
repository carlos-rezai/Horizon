import type { ColumnMapping } from "../../storage/types.js";

/**
 * Extended, server-side bank preset.
 *
 * The client ships a thin UI-facing preset ({@link ../../../src/features/import/bankPresets}).
 * The parse engine needs more: the raw `delimiter`, a `headerSignature` used to
 * locate the header row past any metadata preamble and to detect the bank, and
 * an optional `encoding` override when a bank does not emit a BOM.
 */
export interface BankPreset {
  /** Full ordered header row as the bank exports it. */
  columns: string[];
  /** Which raw column feeds each Horizon field. */
  map: ColumnMapping;
  /** Decimal separator used in amounts (`,` for the German banks). */
  decimal: string;
  /** Date format the bank exports (e.g. `DD.MM.YYYY`). */
  dateFmt: string;
  /** Field delimiter (`;` for the German banks). */
  delimiter: string;
  /**
   * Distinctive subset of `columns`. A parsed row containing all of these
   * is the header row; `parseStatement` scans past the preamble to the first
   * row that contains them, and the same containment check drives bank
   * detection (the first preset whose signature is found wins).
   */
  headerSignature: string[];
  /** Encoding override; when omitted the engine sniffs the BOM. */
  encoding?: string;
  /**
   * True when the bank wraps every field in quotes. Data on the preset so the
   * format slices stay pure; the quote-aware splitter handles it either way.
   */
  quoted?: boolean;
  /**
   * Column whose cell marks a row as not-yet-settled (a "vorgemerkt" /
   * pending booking). When set, a row is pending if its cell value is one of
   * {@link pendingValues}.
   */
  pendingColumn?: string;
  /** Cell values in {@link pendingColumn} that mean the row is pending. */
  pendingValues?: string[];
}

export const BANK_PRESETS: Record<string, BankPreset> = {
  /**
   * Real Sparkasse Girokonto CSV-CAMT export. Built from an anonymized owner
   * export: quoted, `;`-delimited, `DD.MM.YY` 2-digit-year dates, decimal
   * comma, signed `Betrag` (used directly, no inversion). The signature
   * (`Auftragskonto`, `Sammlerreferenz`, `Kategorie`) is distinctive to this
   * CSV-CAMT layout so it never collides with a generic import. `Info` carries
   * "Umsatz vorgemerkt" for not-yet-settled bookings, driving the pending rail.
   */
  Sparkasse: {
    columns: [
      "Auftragskonto",
      "Buchungstag",
      "Valutadatum",
      "Buchungstext",
      "Verwendungszweck",
      "Glaeubiger ID",
      "Mandatsreferenz",
      "Kundenreferenz (End-to-End)",
      "Sammlerreferenz",
      "Lastschrift Ursprungsbetrag",
      "Auslagenersatz Ruecklastschrift",
      "Beguenstigter/Zahlungspflichtiger",
      "Kontonummer/IBAN",
      "BIC (SWIFT-Code)",
      "Betrag",
      "Waehrung",
      "Info",
      "Kategorie",
    ],
    map: {
      date: "Buchungstag",
      description: "Beguenstigter/Zahlungspflichtiger",
      amount: "Betrag",
    },
    decimal: ",",
    dateFmt: "DD.MM.YY",
    delimiter: ";",
    quoted: true,
    headerSignature: ["Auftragskonto", "Sammlerreferenz", "Kategorie"],
    pendingColumn: "Info",
    pendingValues: ["Umsatz vorgemerkt"],
  },
  /**
   * Real Postbank Girokonto CSV export. Built from an anonymized owner export:
   * unquoted, `;`-delimited, `D.M.YYYY` single-digit day/month dates, decimal
   * comma, signed `Betrag` (used directly, no inversion). The export carries a
   * redundant `Soll` / `Haben` debit-credit pair alongside the single signed
   * `Betrag`; the pair is ignored and `Betrag` is the sole amount source. The
   * umlaut header (`Begünstigter / Auftraggeber`) rides the signature-driven
   * encoding retry in `detectStatement`. No pending marker.
   */
  PostbankGiro: {
    columns: [
      "Buchungstag",
      "Wert",
      "Umsatzart",
      "Begünstigter / Auftraggeber",
      "Verwendungszweck",
      "IBAN / Kontonummer",
      "BIC",
      "Kundenreferenz",
      "Mandatsreferenz",
      "Gläubiger ID",
      "Fremde Gebühren",
      "Betrag",
      "Abweichender Empfänger",
      "Anzahl der Aufträge",
      "Anzahl der Schecks",
      "Soll",
      "Haben",
      "Währung",
    ],
    map: {
      date: "Buchungstag",
      description: "Begünstigter / Auftraggeber",
      amount: "Betrag",
    },
    decimal: ",",
    dateFmt: "DD.MM.YYYY",
    delimiter: ";",
    headerSignature: ["Umsatzart", "Soll", "Haben"],
  },
};

/**
 * Label for a statement that matches no known preset. Deliberately NOT a real
 * bank name: a generic import remembers its column mapping under this label,
 * so it can never overwrite a real bank's remembered preset (the latent bug
 * the "DKB" default used to cause).
 */
export const DEFAULT_BANK = "Generic";

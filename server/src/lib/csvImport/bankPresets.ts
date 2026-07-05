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
  Sparkasse: {
    columns: [
      "Buchungstag",
      "Verwendungszweck",
      "Beguenstigter/Zahlungspflichtiger",
      "Betrag",
      "Waehrung",
    ],
    map: {
      date: "Buchungstag",
      description: "Verwendungszweck",
      amount: "Betrag",
    },
    decimal: ",",
    dateFmt: "DD.MM.YYYY",
    delimiter: ";",
    headerSignature: ["Buchungstag", "Waehrung"],
  },
  DKB: {
    columns: [
      "Buchungsdatum",
      "Auftraggeber / Begünstigter",
      "Verwendungszweck",
      "Betrag (€)",
    ],
    map: {
      date: "Buchungsdatum",
      description: "Verwendungszweck",
      amount: "Betrag (€)",
    },
    decimal: ",",
    dateFmt: "DD.MM.YYYY",
    delimiter: ";",
    headerSignature: ["Buchungsdatum", "Betrag (€)"],
  },
  ING: {
    columns: [
      "Buchung",
      "Auftraggeber/Empfänger",
      "Verwendungszweck",
      "Betrag",
      "Saldo",
    ],
    map: { date: "Buchung", description: "Verwendungszweck", amount: "Betrag" },
    decimal: ",",
    dateFmt: "DD.MM.YYYY",
    delimiter: ";",
    headerSignature: ["Buchung", "Saldo"],
    encoding: "windows-1252",
  },
};

/**
 * Label for a statement that matches no known preset. Deliberately NOT a real
 * bank name: a generic import remembers its column mapping under this label,
 * so it can never overwrite a real bank's remembered preset (the latent bug
 * the "DKB" default used to cause).
 */
export const DEFAULT_BANK = "Generic";

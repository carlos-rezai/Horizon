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

/** Fallback bank used when an import can't be matched to a known preset. */
export const DEFAULT_BANK = "DKB";

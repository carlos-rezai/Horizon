/**
 * Per-bank column-mapping presets for CSV import.
 *
 * This is the thin seam the Import UI reads from. The real CSV parsing /
 * detection engine lands in the separate "CSV / Bank Statement Import
 * (backend)" epic; here the presets describe how each known bank's export
 * columns map onto Horizon's date / description / amount fields.
 */

/** Which raw CSV column feeds each Horizon field. */
export interface ColumnMapping {
  date: string;
  desc: string;
  amount: string;
}

/** A known bank's export shape and its default column mapping. */
export interface BankPreset {
  columns: string[];
  map: ColumnMapping;
  decimal: string;
  dateFmt: string;
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
    map: { date: "Buchungstag", desc: "Verwendungszweck", amount: "Betrag" },
    decimal: ",",
    dateFmt: "DD.MM.YYYY",
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
      desc: "Verwendungszweck",
      amount: "Betrag (€)",
    },
    decimal: ",",
    dateFmt: "DD.MM.YYYY",
  },
  ING: {
    columns: [
      "Buchung",
      "Auftraggeber/Empfänger",
      "Verwendungszweck",
      "Betrag",
      "Saldo",
    ],
    map: { date: "Buchung", desc: "Verwendungszweck", amount: "Betrag" },
    decimal: ",",
    dateFmt: "DD.MM.YYYY",
  },
};

/** Fallback bank used when an import can't be matched to a known preset. */
export const DEFAULT_BANK = "DKB";

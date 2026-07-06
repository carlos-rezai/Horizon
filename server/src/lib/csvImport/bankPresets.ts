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
  /**
   * Real Postbank credit-card CSV export. Built from an anonymized owner export:
   * unquoted, `;`-delimited, `D.M.YYYY` single-digit day/month dates, decimal
   * comma. The export carries TWO columns both named `Betrag` — the
   * foreign-currency figure and the EUR figure — which the parse engine's header
   * de-duplication renames `Betrag` and `Betrag (2)`. The EUR `Betrag (2)` is
   * the amount source (never the foreign-currency `Betrag`); card purchases are
   * already negative, so the signed amount is used directly. The signature
   * (`Belegdatum`, `Eingangstag`, `Kurs`) is distinctive to this card layout.
   * The umlaut headers (`Fremdwährung`, `Währung`) ride the signature-driven
   * encoding retry in `detectStatement`. No pending marker. Lands against a
   * CreditCard account.
   */
  PostbankCC: {
    columns: [
      "Belegdatum",
      "Eingangstag",
      "Verwendungszweck",
      "Fremdwährung",
      "Betrag",
      "Kurs",
      "Betrag (2)",
      "Währung",
    ],
    map: {
      date: "Belegdatum",
      description: "Verwendungszweck",
      amount: "Betrag (2)",
    },
    decimal: ",",
    dateFmt: "DD.MM.YYYY",
    delimiter: ";",
    headerSignature: ["Belegdatum", "Eingangstag", "Kurs"],
  },
  /**
   * Real Renault Bank (Tagesgeld) CSV export. Built from an anonymized owner
   * export: unquoted, `;`-delimited, `DD.MM.YYYY` four-digit-year dates, decimal
   * comma, signed `Betrag` (used directly, no inversion). This is the "easy"
   * four-digit-year case; it exists partly as a regression guard so the
   * single-digit / 2-digit-year date hardening from #150/#151 never touches the
   * plain `DD.MM.YYYY` path. Description maps to `Buchungstext` (the booking-text
   * label), NOT the counterparty (`Name Zahlungsbeteiligter`): interest
   * (`Abschluss`) and tax (`Kapitalertragsteuer`) rows carry a blank
   * counterparty, so a counterparty-based description would read empty while
   * `Buchungstext` keeps their label. The signature (`Bezeichnung
   * Auftragskonto`, `Saldo nach Buchung`) is distinctive to this Tagesgeld
   * layout. No pending marker.
   */
  Renault: {
    columns: [
      "Bezeichnung Auftragskonto",
      "IBAN Auftragskonto",
      "BIC Auftragskonto",
      "Bankname Auftragskonto",
      "Buchungstag",
      "Valutadatum",
      "Name Zahlungsbeteiligter",
      "IBAN Zahlungsbeteiligter",
      "BIC (SWIFT) Zahlungsbeteiligter",
      "Buchungstext",
      "Verwendungszweck",
      "Betrag",
      "Waehrung",
      "Saldo nach Buchung",
      "Bemerkung",
      "Kategorie",
      "Steuerrelevant",
      "Glaeubiger ID",
      "Mandatsreferenz",
    ],
    map: {
      date: "Buchungstag",
      description: "Buchungstext",
      amount: "Betrag",
    },
    decimal: ",",
    dateFmt: "DD.MM.YYYY",
    delimiter: ";",
    headerSignature: ["Bezeichnung Auftragskonto", "Saldo nach Buchung"],
  },
};

/**
 * Label for a statement that matches no known preset. Deliberately NOT a real
 * bank name: a generic import remembers its column mapping under this label,
 * so it can never overwrite a real bank's remembered preset (the latent bug
 * the "DKB" default used to cause).
 */
export const DEFAULT_BANK = "Generic";

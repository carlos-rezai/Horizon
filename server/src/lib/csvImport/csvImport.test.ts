import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";
import {
  BANK_PRESETS,
  DEFAULT_BANK,
  parseStatement,
  parseAmount,
  parseDate,
  categorize,
  detectDuplicates,
  detectRecurring,
} from "./index.js";
import type { MappedRow } from "./index.js";
import type { Transaction, RecurringTransaction } from "../../storage/types.js";

// ---------------------------------------------------------------------------
// Fixtures — real anonymized bank exports (Sparkasse, Postbank, Renault) with
// the hard cases: UTF-8 BOM vs Windows-1252, a metadata preamble before the
// header row, decimal-comma amounts, DD.MM.YYYY dates, and a quote-aware
// embedded delimiter.
// ---------------------------------------------------------------------------

function fixtureBytes(name: string): Uint8Array {
  return readFileSync(
    fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url))
  );
}

function fixtureText(name: string): string {
  // The real German-bank fixtures ship no BOM and are Windows-1252-encoded.
  return new TextDecoder("windows-1252").decode(fixtureBytes(name));
}

function makeTxn(
  overrides: Partial<Transaction> & { id: string }
): Transaction {
  return {
    accountId: "acc1",
    date: "2026-11-02",
    amount: -1250,
    description: "Placeholder",
    category: "Food",
    ...overrides,
  };
}

function makeRecurring(
  overrides: Partial<RecurringTransaction> & { id: string }
): RecurringTransaction {
  return {
    accountId: "acc1",
    amount: -85000,
    description: "Miete",
    category: "Housing",
    frequency: "monthly",
    dayOfMonth: 1,
    ...overrides,
  };
}

function mapped(overrides: Partial<MappedRow>): MappedRow {
  return {
    date: "2026-11-02",
    description: "REWE SAGT DANKE",
    amount: -1250,
    category: "Food",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Extended BankPreset constant
// ---------------------------------------------------------------------------

describe("BANK_PRESETS", () => {
  it("ships the real Sparkasse and Postbank giro server-side presets", () => {
    // The guessed DKB / ING / fictional-Sparkasse presets were removed in #150;
    // #151 adds the real PostbankGiro. Each preset's shape is asserted in its
    // own end-to-end spec (sparkasse.test.ts, postbank-giro.test.ts).
    expect(Object.keys(BANK_PRESETS)).toEqual(
      expect.arrayContaining(["Sparkasse", "PostbankGiro"])
    );
    expect(BANK_PRESETS.DKB).toBeUndefined();
    expect(BANK_PRESETS.ING).toBeUndefined();
  });

  it("extends each preset with delimiter, headerSignature, and optional encoding", () => {
    for (const preset of Object.values(BANK_PRESETS)) {
      expect(preset.delimiter).toBe(";");
      expect(Array.isArray(preset.headerSignature)).toBe(true);
      expect(preset.headerSignature.length).toBeGreaterThan(0);
    }
  });

  it("uses a generic fallback label that is not a real bank preset", () => {
    // The fallback must not collide with a known bank, or a generic import
    // would overwrite that bank's remembered preset.
    expect(BANK_PRESETS[DEFAULT_BANK]).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// parseStatement
// ---------------------------------------------------------------------------

describe("parseStatement", () => {
  it("skips a metadata preamble and starts at the headerSignature row", () => {
    // The real Sparkasse export leads with its header row; prepend a synthetic
    // preamble to prove the engine scans past non-header lines to the signature.
    const preamble =
      '"Umsatzanzeige";"Sparkasse Musterstadt"\n' +
      '"Zeitraum";"01.06.26 - 30.06.26"\n\n';
    const { columns, rows } = parseStatement(
      preamble + fixtureText("sparkasse-giro.csv"),
      BANK_PRESETS.Sparkasse
    );

    expect(columns).toEqual(BANK_PRESETS.Sparkasse.columns);
    // Four transactions plus the dateless Endsaldo footer follow the header.
    expect(rows).toHaveLength(5);
    expect(rows[0].Buchungstag).toBe("24.06.26");
    expect(rows[0]["Beguenstigter/Zahlungspflichtiger"]).toBe(
      "MUSTER SUPERMARKT GMBH"
    );
    expect(rows[0].Betrag).toBe("-20,41");
  });

  it("is quote-aware: a delimiter inside a quoted field is not a column break", () => {
    const { rows } = parseStatement(
      fixtureText("sparkasse-giro.csv"),
      BANK_PRESETS.Sparkasse
    );

    // The Verwendungszweck "Rechnung 12; Position 3" carries an embedded ';';
    // the quote-aware split must keep it one field so Betrag stays aligned.
    const dienst = rows.find(
      (r) => r["Beguenstigter/Zahlungspflichtiger"] === "MUSTER DIENST GMBH"
    );
    expect(dienst?.Verwendungszweck).toBe("Rechnung 12; Position 3");
    expect(dienst?.Betrag).toBe("-9,90");
  });
});

// ---------------------------------------------------------------------------
// parseAmount
// ---------------------------------------------------------------------------

describe("parseAmount", () => {
  it("converts a decimal-comma amount to exact integer cents", () => {
    expect(parseAmount("-12,50", ",")).toBe(-1250);
    expect(parseAmount("-9,90", ",")).toBe(-990);
  });

  it("handles a thousands separator without floating-point error", () => {
    expect(parseAmount("2.500,00", ",")).toBe(250000);
    expect(parseAmount("1.234,56", ",")).toBe(123456);
  });
});

// ---------------------------------------------------------------------------
// parseDate
// ---------------------------------------------------------------------------

describe("parseDate", () => {
  it("converts a DD.MM.YYYY date to an ISO date string", () => {
    expect(parseDate("02.11.2026", "DD.MM.YYYY")).toBe("2026-11-02");
    expect(parseDate("31.12.2026", "DD.MM.YYYY")).toBe("2026-12-31");
  });
});

// ---------------------------------------------------------------------------
// categorize
// ---------------------------------------------------------------------------

describe("categorize", () => {
  it("maps representative descriptions onto the eight real categories", () => {
    expect(categorize("REWE SAGT DANKE")).toBe("Food");
    expect(categorize("Lebensmittel EDEKA")).toBe("Food");
    expect(categorize("Miete Oktober")).toBe("Housing");
    expect(categorize("Gehalt Oktober")).toBe("Income");
    expect(categorize("Netflix Abo")).toBe("Subscriptions");
    expect(categorize("Sparplan ETF MSCI World")).toBe("Investment");
  });

  it("is case-insensitive", () => {
    expect(categorize("rewe sagt danke")).toBe("Food");
  });

  it("falls back to Miscellaneous when no keyword matches", () => {
    expect(categorize("Zufaellige unbekannte Zahlung XYZ")).toBe(
      "Miscellaneous"
    );
  });
});

// ---------------------------------------------------------------------------
// detectDuplicates
// ---------------------------------------------------------------------------

describe("detectDuplicates", () => {
  it("flags a row matching an existing account transaction by signed amount, ISO date, and normalized description", () => {
    const rows: MappedRow[] = [
      mapped({
        description: "REWE SAGT DANKE",
        amount: -1250,
        date: "2026-11-02",
      }),
      mapped({
        description: "Gehalt Oktober",
        amount: 250000,
        date: "2026-11-05",
        category: "Income",
      }),
    ];
    const existing: Transaction[] = [
      // Same amount + date, description differs only by case and whitespace.
      makeTxn({
        id: "t1",
        description: "rewe   sagt  danke",
        amount: -1250,
        date: "2026-11-02",
      }),
    ];

    expect(detectDuplicates(rows, existing)).toEqual([true, false]);
  });

  it("does not flag a row when the existing transaction differs in date or amount", () => {
    const rows: MappedRow[] = [mapped({ amount: -1250, date: "2026-11-02" })];
    const existing: Transaction[] = [
      makeTxn({
        id: "t1",
        description: "REWE SAGT DANKE",
        amount: -1250,
        date: "2026-11-09",
      }),
      makeTxn({
        id: "t2",
        description: "REWE SAGT DANKE",
        amount: -9999,
        date: "2026-11-02",
      }),
    ];

    expect(detectDuplicates(rows, existing)).toEqual([false]);
  });

  it("de-dupes repeats within the same file, flagging only the later occurrence", () => {
    const rows: MappedRow[] = [
      mapped({
        description: "REWE SAGT DANKE",
        amount: -1250,
        date: "2026-11-02",
      }),
      mapped({
        description: "Aldi Einkauf",
        amount: -1999,
        date: "2026-11-07",
      }),
      mapped({
        description: "REWE SAGT DANKE",
        amount: -1250,
        date: "2026-11-02",
      }),
    ];

    expect(detectDuplicates(rows, [])).toEqual([false, false, true]);
  });
});

// ---------------------------------------------------------------------------
// detectRecurring
// ---------------------------------------------------------------------------

describe("detectRecurring", () => {
  it("flags rows matching a recurring transaction by sign, amount, and description containment in either direction", () => {
    const recurring: RecurringTransaction[] = [
      makeRecurring({ id: "r1", description: "Miete", amount: -85000 }),
      makeRecurring({
        id: "r2",
        description: "Netflix Monatsabo",
        amount: -1299,
        category: "Subscriptions",
      }),
    ];
    const rows: MappedRow[] = [
      mapped({
        description: "Miete Oktober Vermieter",
        amount: -85000,
        category: "Housing",
      }),
      mapped({
        description: "Netflix",
        amount: -1299,
        category: "Subscriptions",
      }),
      mapped({ description: "REWE SAGT DANKE", amount: -1250 }),
    ];

    expect(detectRecurring(rows, recurring)).toEqual([true, true, false]);
  });

  it("does not flag a row whose sign differs from the recurring transaction", () => {
    const recurring: RecurringTransaction[] = [
      makeRecurring({ id: "r1", description: "Miete", amount: -85000 }),
    ];
    const rows: MappedRow[] = [
      mapped({
        description: "Miete Rueckzahlung",
        amount: 85000,
        category: "Housing",
      }),
    ];

    expect(detectRecurring(rows, recurring)).toEqual([false]);
  });
});

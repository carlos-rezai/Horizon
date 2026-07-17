import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";
import { buildPreview } from "./buildPreview.js";
import { BANK_PRESETS } from "./bankPresets.js";
import type { BankPreset } from "./bankPresets.js";
import { parseStatement } from "./parse.js";
import type { StoredImportPreset } from "../../storage/types.js";

// ---------------------------------------------------------------------------
// Issue #152 — Real Postbank credit-card CSV import, end-to-end.
//
// Adds the Postbank credit-card format, whose export carries TWO columns both
// literally named `Betrag`: the foreign-currency figure and the EUR figure. The
// whole fix is header de-duplication in the parse engine — never a move to
// index-based mapping:
//   - when building `columns` from the located header, the n-th duplicate
//     (n >= 2) of a name X is renamed `X (n)`; the first occurrence keeps its
//     bare name, and row records are keyed by the de-duplicated names so
//     `Betrag` and `Betrag (2)` address distinct cells.
//   - the Postbank-CC preset: signature Belegdatum, Eingangstag, Kurs; map date
//     Belegdatum, description Verwendungszweck, amount `Betrag (2)` (the EUR
//     column, not the foreign-currency one); unquoted, ';'-delimited, decimal
//     comma, DD.MM.YYYY dates, no pending marker.
//
// Card purchases are already negative, so the signed amount is used directly.
// Behaviour is asserted through the public parseStatement / BANK_PRESETS /
// buildPreview surface and an anonymized fixture — never the private helpers.
// ---------------------------------------------------------------------------

const FIXTURE = "postbank-cc.csv";

/** The anonymized fixture as shipped: Windows-1252 bytes, no BOM. */
function fixtureBytes(name: string): Uint8Array {
  return readFileSync(
    fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url))
  );
}

const noPreset = async (): Promise<StoredImportPreset | null> => null;

function preview(bytes: Uint8Array) {
  return buildPreview({
    bytes,
    existingTxns: [],
    recurring: [],
    getRememberedPreset: noPreset,
  });
}

// ---------------------------------------------------------------------------
// parseStatement — header de-duplication (AC1, isolated unit tests)
//
// Driven with synthetic text and a minimal preset so the de-dup rule is proven
// on its own, independent of the Postbank-CC preset or fixture.
// ---------------------------------------------------------------------------

/** A minimal preset whose ASCII signature locates a header carrying a duplicate. */
function dedupPreset(headerSignature: string[]): BankPreset {
  return {
    columns: [],
    map: {
      date: "Belegdatum",
      description: "Verwendungszweck",
      amount: "Betrag (2)",
    },
    decimal: ",",
    dateFmt: "DD.MM.YYYY",
    delimiter: ";",
    headerSignature,
  };
}

describe("parseStatement — header de-duplication", () => {
  // Mirrors the real Postbank-CC header order: foreign `Betrag` (col 4) then
  // `Kurs` then the EUR `Betrag` (col 6) that de-dup renames `Betrag (2)`.
  const CC_HEADER =
    "Belegdatum;Verwendungszweck;Fremdwaehrung;Betrag;Kurs;Betrag;Waehrung\n";
  const CC_ROW = "2.6.2026;MUSTER FILM CO;USD;-31,99;1,16074;-27,56;EUR\n";

  it("renames the 2nd duplicate of a column to `X (2)` and keeps the first bare", () => {
    const { columns } = parseStatement(
      CC_HEADER + CC_ROW,
      dedupPreset(["Belegdatum", "Kurs"])
    );

    // The n-th duplicate (n >= 2) is renamed; the first occurrence stays bare.
    expect(columns).toEqual([
      "Belegdatum",
      "Verwendungszweck",
      "Fremdwaehrung",
      "Betrag",
      "Kurs",
      "Betrag (2)",
      "Waehrung",
    ]);
    // No bare-name collision survives, and the disambiguated name exists once.
    expect(columns.filter((c) => c === "Betrag")).toHaveLength(1);
    expect(columns).toContain("Betrag (2)");
    expect(columns).not.toContain("Betrag (1)");
  });

  it("keys rows by the de-duplicated names so `Betrag` and `Betrag (2)` are distinct cells", () => {
    const { rows } = parseStatement(
      CC_HEADER + CC_ROW,
      dedupPreset(["Belegdatum", "Kurs"])
    );

    // Without de-dup the second `Betrag` would overwrite the first in the row
    // record; the two must instead address separate cells — the foreign amount
    // (-31,99) and the EUR amount (-27,56).
    expect(rows[0].Betrag).toBe("-31,99");
    expect(rows[0]["Betrag (2)"]).toBe("-27,56");
  });

  it("numbers a triple duplicate `X`, `X (2)`, `X (3)`", () => {
    const text = "A;X;X;X\n1;2;3;4\n";

    const { columns, rows } = parseStatement(text, dedupPreset(["A"]));

    expect(columns).toEqual(["A", "X", "X (2)", "X (3)"]);
    expect(rows[0]).toMatchObject({
      A: "1",
      X: "2",
      "X (2)": "3",
      "X (3)": "4",
    });
  });
});

// ---------------------------------------------------------------------------
// BANK_PRESETS — the real Postbank credit-card preset is added (AC2)
// ---------------------------------------------------------------------------

describe("BANK_PRESETS — Postbank credit-card added", () => {
  it("registers PostbankCC alongside the real Sparkasse and Postbank giro presets", () => {
    expect(Object.keys(BANK_PRESETS)).toEqual(
      expect.arrayContaining(["Sparkasse", "PostbankGiro", "PostbankCC"])
    );
  });

  it("maps the EUR `Betrag (2)` column and carries the CC signature and shape", () => {
    const preset = BANK_PRESETS.PostbankCC;

    expect(preset.map).toEqual({
      date: "Belegdatum",
      description: "Verwendungszweck",
      amount: "Betrag (2)",
    });
    expect(preset.dateFmt).toBe("DD.MM.YYYY");
    expect(preset.decimal).toBe(",");
    expect(preset.delimiter).toBe(";");
    // Postbank CC exports are unquoted — the quoted flag must be absent/false.
    expect(preset.quoted ?? false).toBe(false);
    expect(preset.headerSignature).toEqual(
      expect.arrayContaining(["Belegdatum", "Eingangstag", "Kurs"])
    );
    // No provisional/pending marker on the credit-card format.
    expect(preset.pendingColumn).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Detection + end-to-end import of the anonymized Postbank CC fixture (AC3)
// ---------------------------------------------------------------------------

describe("buildPreview — Postbank credit-card fixture", () => {
  it("detects PostbankCC by its signature and returns the real mapping", async () => {
    const result = await preview(fixtureBytes(FIXTURE));

    expect(result.bank).toBe("PostbankCC");
    expect(result.mapping).toEqual({
      date: "Belegdatum",
      description: "Verwendungszweck",
      amount: "Betrag (2)",
    });
    expect(result.dateFmt).toBe("DD.MM.YYYY");
    // The full real header — including the de-duplicated `Betrag (2)` — flows
    // through the preview end-to-end.
    expect(result.columns).toEqual(
      expect.arrayContaining([
        "Belegdatum",
        "Eingangstag",
        "Verwendungszweck",
        "Fremdwährung",
        "Betrag",
        "Kurs",
        "Betrag (2)",
        "Währung",
      ])
    );
  });

  it("imports the EUR amount from `Betrag (2)`, never the foreign-currency `Betrag`", async () => {
    const result = await preview(fixtureBytes(FIXTURE));

    // The film-shop row is -31,99 USD converted at 1,16074 to -27,56 EUR. Using
    // the foreign `Betrag` would give -3199; the EUR `Betrag (2)` must win.
    const film = result.rows.find(
      (r) => r.description === "MUSTER FILM CO, 19073 NEWTOWN, PA, USA"
    );
    expect(film).toMatchObject({ date: "2026-06-02", amount: -2756 });
    expect(film?.amount).not.toBe(-3199);
  });

  it("maps a domestic card purchase to a negative EUR amount with its Verwendungszweck", async () => {
    const result = await preview(fixtureBytes(FIXTURE));

    const cat = result.rows.find(
      (r) => r.description === "SP MUSTER CAT, 10119 BERLIN, BE, DEU"
    );
    expect(cat).toMatchObject({
      date: "2026-06-02",
      amount: -18376,
      pending: false,
    });

    // The umlaut-bearing Verwendungszweck decodes from the Windows-1252 body.
    const baeckerei = result.rows.find(
      (r) => r.description === "MÜLLER BÄCKEREI"
    );
    expect(baeckerei).toMatchObject({ date: "2026-06-15", amount: -990 });
  });

  it("preserves the sign of a credit and parses the foreign-usage fee", async () => {
    const result = await preview(fixtureBytes(FIXTURE));

    const credit = result.rows.find(
      (r) => r.description === "GUTSCHRIFT MUSTER AG"
    );
    expect(credit).toMatchObject({ date: "2026-06-10", amount: 1990 });

    const fee = result.rows.find(
      (r) => r.description === "AUSLANDSEINSATZENTGELT"
    );
    expect(fee).toMatchObject({ date: "2026-06-03", amount: -51 });
  });

  it("imports every dated card row with no rejects and no pending", async () => {
    const result = await preview(fixtureBytes(FIXTURE));

    // Five real card postings; none is provisional and none fails to parse.
    expect(result.rows).toHaveLength(5);
    expect(result.summary).toMatchObject({
      total: 5,
      duplicates: 0,
      recurring: 0,
      pending: 0,
      rejected: { count: 0, samples: [] },
    });
  });
});

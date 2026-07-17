import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";
import { buildPreview } from "./buildPreview.js";
import { BANK_PRESETS, DEFAULT_BANK } from "./bankPresets.js";
import { parseDate } from "./parse.js";
import type { StoredImportPreset } from "../../storage/types.js";

// ---------------------------------------------------------------------------
// Issue #150 — Real Sparkasse (Girokonto) CSV-CAMT import, end-to-end.
//
// Replaces the three guessed presets (Sparkasse / DKB / ING) with the single
// real Sparkasse preset built from an anonymized CSV-CAMT export:
//   - quoted, ';'-delimited, DD.MM.YY (2-digit year) dates, decimal comma
//   - signature: Auftragskonto, Sammlerreferenz
//   - map: date Buchungstag, description Beguenstigter/Zahlungspflichtiger,
//     amount signed Betrag
//   - pendingColumn Info, pendingValues ["Umsatz vorgemerkt"]
//
// The pending / rejected / empty-date rails themselves landed in #149; this
// slice supplies the Sparkasse data that drives them and hardens parseDate for
// the 2-digit year. Behaviour is asserted through the public buildPreview /
// parseDate surface and the anonymized fixture — never the private helpers.
// ---------------------------------------------------------------------------

const FIXTURE = "sparkasse-giro.csv";

function fixtureBytes(name: string): Uint8Array {
  return readFileSync(
    fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url))
  );
}

const noPreset = async (): Promise<StoredImportPreset | null> => null;

// ---------------------------------------------------------------------------
// BANK_PRESETS — only the real Sparkasse preset survives
// ---------------------------------------------------------------------------

describe("BANK_PRESETS — real Sparkasse only", () => {
  it("keeps the real Sparkasse preset (DKB, ING, fictional mapping removed)", () => {
    // #151 adds PostbankGiro alongside Sparkasse; the guessed DKB/ING and the
    // fictional Sparkasse mapping stay gone.
    expect(Object.keys(BANK_PRESETS)).toEqual(
      expect.arrayContaining(["Sparkasse"])
    );
    expect(BANK_PRESETS.DKB).toBeUndefined();
    expect(BANK_PRESETS.ING).toBeUndefined();
    // The generic fallback label must never become a real preset, or a generic
    // import could overwrite a real bank's remembered mapping.
    expect(BANK_PRESETS[DEFAULT_BANK]).toBeUndefined();
  });

  it("maps the real Sparkasse columns and carries the quoted / pending shape", () => {
    const preset = BANK_PRESETS.Sparkasse;

    expect(preset.map).toEqual({
      date: "Buchungstag",
      description: "Beguenstigter/Zahlungspflichtiger",
      amount: "Betrag",
    });
    expect(preset.dateFmt).toBe("DD.MM.YY");
    expect(preset.decimal).toBe(",");
    expect(preset.delimiter).toBe(";");
    expect(preset.quoted).toBe(true);
    expect(preset.headerSignature).toEqual(
      expect.arrayContaining(["Auftragskonto", "Sammlerreferenz"])
    );
    expect(preset.pendingColumn).toBe("Info");
    expect(preset.pendingValues).toEqual(["Umsatz vorgemerkt"]);
  });
});

// ---------------------------------------------------------------------------
// parseDate — 2-digit year hardening
// ---------------------------------------------------------------------------

describe("parseDate — 2-digit year expansion", () => {
  it("expands DD.MM.YY to 20YY (no pivot) and leaves DD.MM.YYYY unchanged", () => {
    // Bank statements are always current: a bare YY is unconditionally 20YY.
    expect(parseDate("24.06.26", "DD.MM.YY")).toBe("2026-06-24");
    expect(parseDate("31.12.26", "DD.MM.YY")).toBe("2026-12-31");
    expect(parseDate("01.01.30", "DD.MM.YY")).toBe("2030-01-01");
    // A four-digit year passes straight through unchanged (regression guard).
    expect(parseDate("02.11.2026", "DD.MM.YYYY")).toBe("2026-11-02");
  });
});

// ---------------------------------------------------------------------------
// Detection + end-to-end import of the anonymized Sparkasse fixture
// ---------------------------------------------------------------------------

describe("buildPreview — Sparkasse CSV-CAMT fixture", () => {
  it("detects Sparkasse by its signature and returns the real column mapping", async () => {
    const preview = await buildPreview({
      bytes: fixtureBytes(FIXTURE),
      existingTxns: [],
      recurring: [],
      getRememberedPreset: noPreset,
    });

    expect(preview.bank).toBe("Sparkasse");
    expect(preview.mapping).toEqual({
      date: "Buchungstag",
      description: "Beguenstigter/Zahlungspflichtiger",
      amount: "Betrag",
    });
    expect(preview.dateFmt).toBe("DD.MM.YY");
    expect(preview.columns).toEqual(
      expect.arrayContaining([
        "Auftragskonto",
        "Sammlerreferenz",
        "Kategorie",
        "Buchungstag",
        "Beguenstigter/Zahlungspflichtiger",
        "Betrag",
        "Info",
      ])
    );
  });

  it("maps 2-digit-year dates, signed amounts, and Beguenstigter descriptions", async () => {
    const preview = await buildPreview({
      bytes: fixtureBytes(FIXTURE),
      existingTxns: [],
      recurring: [],
      getRememberedPreset: noPreset,
    });

    const supermarkt = preview.rows.find(
      (r) => r.description === "MUSTER SUPERMARKT GMBH"
    );
    expect(supermarkt).toMatchObject({
      date: "2026-06-24",
      amount: -2041,
      pending: false,
    });
  });

  it("imports a positive credit with its sign preserved (no inversion)", async () => {
    const preview = await buildPreview({
      bytes: fixtureBytes(FIXTURE),
      existingTxns: [],
      recurring: [],
      getRememberedPreset: noPreset,
    });

    const gehalt = preview.rows.find(
      (r) => r.description === "ARBEITGEBER MUSTER AG"
    );
    expect(gehalt).toMatchObject({ date: "2026-06-05", amount: 250000 });
  });

  it("flags an 'Umsatz vorgemerkt' row as pending and counts it in the summary", async () => {
    const preview = await buildPreview({
      bytes: fixtureBytes(FIXTURE),
      existingTxns: [],
      recurring: [],
      getRememberedPreset: noPreset,
    });

    const provisional = preview.rows.find(
      (r) => r.description === "MUSTER VERSAND GMBH"
    );
    expect(provisional).toMatchObject({
      pending: true,
      amount: -3499,
      date: "2026-06-26",
    });
    expect(preview.summary.pending).toBe(1);
    // Settled rows stay unflagged — pending is a per-row default, not a lock.
    const settled = preview.rows.filter(
      (r) => r.description !== "MUSTER VERSAND GMBH"
    );
    expect(settled.every((r) => !r.pending)).toBe(true);
  });

  it("parses the quoted ';'-delimited file so an embedded ';' is one field", async () => {
    const preview = await buildPreview({
      bytes: fixtureBytes(FIXTURE),
      existingTxns: [],
      recurring: [],
      getRememberedPreset: noPreset,
    });

    // The row whose Verwendungszweck contains "Rechnung 12; Position 3" must
    // keep its columns aligned — proof the quote-aware split held the embedded
    // delimiter, so Betrag reads -9,90 → -990 and not a shifted cell.
    const dienst = preview.rows.find(
      (r) => r.description === "MUSTER DIENST GMBH"
    );
    expect(dienst).toMatchObject({ amount: -990, date: "2026-06-10" });
  });

  it("skips the empty-date footer without counting it rejected", async () => {
    const preview = await buildPreview({
      bytes: fixtureBytes(FIXTURE),
      existingTxns: [],
      recurring: [],
      getRememberedPreset: noPreset,
    });

    // Four real transactions; the dateless Endsaldo footer is dropped silently.
    expect(preview.rows).toHaveLength(4);
    expect(preview.summary).toMatchObject({
      total: 4,
      duplicates: 0,
      recurring: 0,
      pending: 1,
      rejected: { count: 0, samples: [] },
    });
  });
});

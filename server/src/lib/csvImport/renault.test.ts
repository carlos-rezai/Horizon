import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";
import { buildPreview } from "./buildPreview.js";
import { BANK_PRESETS } from "./bankPresets.js";
import { parseDate } from "./parse.js";
import type { StoredImportPreset } from "../../storage/types.js";

// ---------------------------------------------------------------------------
// Issue #153 — Real Renault Bank (Tagesgeld) CSV import, end-to-end.
//
// Adds the Renault Tagesgeld format — the "easy" 4-digit-year case that must
// not regress under the date hardening from #150/#151:
//   - unquoted, ';'-delimited, DD.MM.YYYY (four-digit-year) dates, decimal
//     comma, signed Betrag (used directly, no inversion)
//   - signature: Bezeichnung Auftragskonto, Saldo nach Buchung
//   - map: date Buchungstag, description Buchungstext, amount signed Betrag
//   - no pending column
//
// Description is deliberately mapped to Buchungstext (the booking-text label),
// NOT the counterparty (Name Zahlungsbeteiligter). Interest (Abschluss) and
// tax (Kapitalertragsteuer) rows have a blank counterparty, so a
// counterparty-based description would read empty; Buchungstext keeps their
// label. All behaviour is asserted through the public buildPreview / parseDate
// surface and the anonymized fixture — never private helpers.
// ---------------------------------------------------------------------------

const FIXTURE = "renault.csv";

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
// BANK_PRESETS — the real Renault Tagesgeld preset is added alongside the rest
// ---------------------------------------------------------------------------

describe("BANK_PRESETS — Renault Tagesgeld added", () => {
  it("registers Renault alongside the other real presets", () => {
    expect(Object.keys(BANK_PRESETS)).toEqual(
      expect.arrayContaining([
        "Sparkasse",
        "PostbankGiro",
        "PostbankCC",
        "Renault",
      ])
    );
  });

  it("maps the real Renault columns with Buchungstext as the description", () => {
    const preset = BANK_PRESETS.Renault;

    expect(preset.map).toEqual({
      date: "Buchungstag",
      description: "Buchungstext",
      amount: "Betrag",
    });
    expect(preset.dateFmt).toBe("DD.MM.YYYY");
    expect(preset.decimal).toBe(",");
    expect(preset.delimiter).toBe(";");
    // Renault exports are unquoted — the quoted flag must be absent/false.
    expect(preset.quoted ?? false).toBe(false);
    expect(preset.headerSignature).toEqual(
      expect.arrayContaining([
        "Bezeichnung Auftragskonto",
        "Saldo nach Buchung",
      ])
    );
    // Renault Tagesgeld has no pending marker.
    expect(preset.pendingColumn).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// parseDate — four-digit-year dates still parse unchanged (regression guard).
// The single-digit / 2-digit-year hardening from #150/#151 must not have
// touched the plain DD.MM.YYYY case.
// ---------------------------------------------------------------------------

describe("parseDate — four-digit-year regression guard", () => {
  it("passes DD.MM.YYYY dates through to ISO unchanged", () => {
    expect(parseDate("15.03.2026", "DD.MM.YYYY")).toBe("2026-03-15");
    expect(parseDate("18.03.2026", "DD.MM.YYYY")).toBe("2026-03-18");
    expect(parseDate("31.03.2026", "DD.MM.YYYY")).toBe("2026-03-31");
    expect(parseDate("31.12.2026", "DD.MM.YYYY")).toBe("2026-12-31");
  });
});

// ---------------------------------------------------------------------------
// Detection + end-to-end import of the anonymized Renault fixture
// ---------------------------------------------------------------------------

describe("buildPreview — Renault Tagesgeld fixture", () => {
  it("detects Renault by its signature and returns the real mapping", async () => {
    const result = await preview(fixtureBytes(FIXTURE));

    expect(result.bank).toBe("Renault");
    expect(result.mapping).toEqual({
      date: "Buchungstag",
      description: "Buchungstext",
      amount: "Betrag",
    });
    expect(result.dateFmt).toBe("DD.MM.YYYY");
    expect(result.columns).toEqual(
      expect.arrayContaining([
        "Bezeichnung Auftragskonto",
        "Saldo nach Buchung",
        "Buchungstag",
        "Buchungstext",
        "Betrag",
      ])
    );
  });

  it("maps four-digit-year dates and signed amounts on a normal row", async () => {
    const result = await preview(fixtureBytes(FIXTURE));

    const gutschrift = result.rows.find((r) => r.description === "Gutschrift");
    expect(gutschrift).toMatchObject({ date: "2026-03-15", amount: 150000 });

    const lastschrift = result.rows.find(
      (r) => r.description === "Lastschrift"
    );
    expect(lastschrift).toMatchObject({ date: "2026-03-18", amount: -4590 });
  });

  it("shows the Buchungstext label on blank-counterparty interest/tax rows", async () => {
    const result = await preview(fixtureBytes(FIXTURE));

    // The interest settlement carries a blank counterparty; its description
    // must fall back to the Buchungstext label, not an empty string.
    const abschluss = result.rows.find((r) => r.description === "Abschluss");
    expect(abschluss).toBeDefined();
    expect(abschluss?.description).not.toBe("");
    expect(abschluss).toMatchObject({ date: "2026-03-31", amount: 1234 });

    const steuer = result.rows.find(
      (r) => r.description === "Kapitalertragsteuer"
    );
    expect(steuer).toBeDefined();
    expect(steuer?.description).not.toBe("");
    // Tax is a debit — its negative sign is preserved (no inversion).
    expect(steuer).toMatchObject({ date: "2026-03-31", amount: -326 });
  });

  it("imports every Renault row end-to-end with nothing rejected", async () => {
    const result = await preview(fixtureBytes(FIXTURE));

    expect(result.bank).toBe("Renault");
    expect(result.rows).toHaveLength(4);
    expect(result.summary).toMatchObject({
      total: 4,
      duplicates: 0,
      recurring: 0,
      pending: 0,
      rejected: { count: 0, samples: [] },
    });
  });
});

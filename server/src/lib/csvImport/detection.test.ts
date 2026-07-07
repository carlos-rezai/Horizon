import { existsSync, readFileSync } from "fs";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";
import {
  BANK_PRESETS,
  DEFAULT_BANK,
  detectStatement,
  parseStatement,
  StatementParseError,
  MAX_ROWS,
  MAX_COLUMNS,
  buildPreview,
} from "./index.js";
import type { StoredImportPreset } from "../../storage/types.js";

// ---------------------------------------------------------------------------
// Issue #154 — Real Bank CSV Import: detection integrity, reset migration &
// fallback. This slice closes the epic by proving the four real presets are
// mutually exclusive, that an unknown bank still falls through to the generic
// fallback, that an unmatched-and-unmappable file fails loudly, that the caps
// still bite, and that no guessed presets or their fixtures survive.
//
// It also pins the Renault header to the REAL export shape (18 columns,
// "BIC (SWIFT-Code) Zahlungsbeteiligter", a single "Gekennzeichneter Umsatz"
// column — no invented "Kategorie"/"Steuerrelevant"): #153 shipped a fixture
// whose header drifted from the real bank export, and this closing slice
// corrects it so every fixture is faithful to its source.
//
// All behaviour is asserted through the public detect/parse/buildPreview
// surface and the anonymized fixtures — never the private helpers.
// ---------------------------------------------------------------------------

function fixturePath(name: string): string {
  return fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url));
}

function fixtureBytes(name: string): Uint8Array {
  return readFileSync(fixturePath(name));
}

/** The real German-bank fixtures ship no BOM and are Windows-1252-encoded. */
function fixtureText(name: string): string {
  return new TextDecoder("windows-1252").decode(fixtureBytes(name));
}

/** Encode synthetic statement text with a UTF-8 BOM so the sniff picks UTF-8. */
function bytesOf(text: string): Uint8Array {
  const utf8Bom = String.fromCharCode(0xfeff);
  return new TextEncoder().encode(utf8Bom + text);
}

const noPreset = async (): Promise<StoredImportPreset | null> => null;

/** Each real fixture and the bank its signature must resolve to. */
const REAL_FIXTURES: Record<string, string> = {
  Sparkasse: "sparkasse-giro.csv",
  PostbankGiro: "postbank-giro.csv",
  PostbankCC: "postbank-cc.csv",
  Renault: "renault.csv",
};

// ---------------------------------------------------------------------------
// AC1 — the four real signatures are mutually exclusive and order-independent
// ---------------------------------------------------------------------------

describe("detection integrity — mutually-exclusive signatures", () => {
  it("detects each real fixture as its own bank", () => {
    for (const [bank, file] of Object.entries(REAL_FIXTURES)) {
      expect(detectStatement(fixtureBytes(file)).bank).toBe(bank);
    }
  });

  it("never lets one bank's signature claim another bank's fixture (order-independent)", () => {
    // Full fixture x preset matrix: a preset locates a header IFF it owns the
    // fixture. Because exactly one preset ever matches a given file, detection's
    // first-match-wins loop is independent of BANK_PRESETS iteration order — no
    // Sparkasse file is ever claimed by Renault, and vice-versa, in either
    // direction.
    for (const [fixtureBank, file] of Object.entries(REAL_FIXTURES)) {
      const text = fixtureText(file);
      for (const [presetBank, preset] of Object.entries(BANK_PRESETS)) {
        const located = parseStatement(text, preset).columns.length > 0;
        expect({ fixtureBank, presetBank, located }).toEqual({
          fixtureBank,
          presetBank,
          located: presetBank === fixtureBank,
        });
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Renault header fidelity — the real 18-column export shape (#153 correction)
// ---------------------------------------------------------------------------

describe("Renault preset — faithful to the real export header", () => {
  // The real Renault Bank (Tagesgeld) export header, exactly as the bank emits
  // it: 18 columns, "BIC (SWIFT-Code) Zahlungsbeteiligter", and a single
  // "Gekennzeichneter Umsatz" column. The #153 fixture/preset drifted to a
  // 19-column shape with "BIC (SWIFT)" and an invented "Kategorie"/
  // "Steuerrelevant" pair; this pins the corrected shape.
  const REAL_RENAULT_HEADER = [
    "Bezeichnung Auftragskonto",
    "IBAN Auftragskonto",
    "BIC Auftragskonto",
    "Bankname Auftragskonto",
    "Buchungstag",
    "Valutadatum",
    "Name Zahlungsbeteiligter",
    "IBAN Zahlungsbeteiligter",
    "BIC (SWIFT-Code) Zahlungsbeteiligter",
    "Buchungstext",
    "Verwendungszweck",
    "Betrag",
    "Waehrung",
    "Saldo nach Buchung",
    "Bemerkung",
    "Gekennzeichneter Umsatz",
    "Glaeubiger ID",
    "Mandatsreferenz",
  ];

  it("declares the real 18-column header on the preset", () => {
    expect(BANK_PRESETS.Renault.columns).toEqual(REAL_RENAULT_HEADER);
  });

  it("locates the real header in the fixture, and the mapping/signature still hold", () => {
    const detected = detectStatement(fixtureBytes("renault.csv"));

    expect(detected.bank).toBe("Renault");
    expect(detected.columns).toEqual(REAL_RENAULT_HEADER);
    // The invented columns must be gone; the real one must be present.
    expect(detected.columns).toContain("Gekennzeichneter Umsatz");
    expect(detected.columns).toContain("BIC (SWIFT-Code) Zahlungsbeteiligter");
    expect(detected.columns).not.toContain("Kategorie");
    expect(detected.columns).not.toContain("Steuerrelevant");
    // The correction leaves the field mapping untouched.
    expect(detected.mapping).toEqual({
      date: "Buchungstag",
      description: "Buchungstext",
      amount: "Betrag",
    });
  });
});

// ---------------------------------------------------------------------------
// AC2 — an unknown bank falls through to the generic fallback and imports
// ---------------------------------------------------------------------------

describe("generic fallback — unknown bank stays importable", () => {
  const unknownBank = [
    "Datum;Empfaenger;Verwendungszweck;Umsatz",
    "02.11.2026;EDEKA;Lebensmittel;-34,20",
    "05.11.2026;Arbeitgeber;Gehalt;2.500,00",
  ].join("\n");

  it("labels an unmatched-but-mappable file Generic and yields importable rows", async () => {
    const preview = await buildPreview({
      bytes: bytesOf(unknownBank),
      existingTxns: [],
      recurring: [],
      getRememberedPreset: noPreset,
    });

    expect(preview.bank).toBe(DEFAULT_BANK);
    // A usable, adjustable mapping the wizard can present.
    expect(typeof preview.mapping.date).toBe("string");
    expect(typeof preview.mapping.description).toBe("string");
    expect(typeof preview.mapping.amount).toBe("string");
    // Both rows import cleanly — nothing rejected, nothing silently dropped.
    expect(preview.summary.total).toBe(2);
    expect(preview.summary.rejected).toBe(0);
    const rewe = preview.rows.find((r) => r.date === "2026-11-02");
    expect(rewe?.amount).toBe(-3420);
  });
});

// ---------------------------------------------------------------------------
// AC3 — an unmatched file with no mappable columns fails loudly
// ---------------------------------------------------------------------------

describe("generic fallback — unmappable file fails, never silently empty", () => {
  const unmappable = ["Alpha;Beta;Gamma", "1;2;3"].join("\n");

  it("throws a clear StatementParseError when no date/description/amount column is found", () => {
    expect(() => detectStatement(bytesOf(unmappable))).toThrow(
      StatementParseError
    );
    expect(() => detectStatement(bytesOf(unmappable))).toThrow(
      /date, description, and amount/i
    );
  });

  it("rejects the same file through buildPreview rather than importing zero rows", async () => {
    await expect(
      buildPreview({
        bytes: bytesOf(unmappable),
        existingTxns: [],
        recurring: [],
        getRememberedPreset: noPreset,
      })
    ).rejects.toThrow(StatementParseError);
  });
});

// ---------------------------------------------------------------------------
// AC6 — the hard caps still reject a pathological file outright
// ---------------------------------------------------------------------------

describe("hard caps — pathological files are rejected, never truncated", () => {
  it("rejects a file past MAX_COLUMNS", () => {
    const header = Array.from(
      { length: MAX_COLUMNS + 1 },
      (_, i) => `Col${i}`
    ).join(";");
    expect(() => detectStatement(bytesOf(header + "\n"))).toThrow(
      /Too many columns/
    );
  });

  it("rejects a file past MAX_ROWS", () => {
    const header = "Datum;Verwendungszweck;Betrag\n";
    const row = "02.11.2026;X;-1,00\n";
    const csv = header + row.repeat(MAX_ROWS + 1);
    expect(() => detectStatement(bytesOf(csv))).toThrow(/Too many rows/);
  });
});

// ---------------------------------------------------------------------------
// AC5 — a remembered correction round-trips for a real bank
// ---------------------------------------------------------------------------

describe("remembered preset — a per-bank correction is re-applied", () => {
  it("prefers a bank's remembered mapping over the freshly-detected default", async () => {
    // A wizard correction that re-points Renault's description from Buchungstext
    // to Verwendungszweck. On the next import of a Renault file it must win over
    // the detected default.
    const remembered: StoredImportPreset = {
      mapping: {
        date: "Buchungstag",
        description: "Verwendungszweck",
        amount: "Betrag",
      },
      delimiter: ";",
      decimal: ",",
      dateFmt: "DD.MM.YYYY",
    };

    const preview = await buildPreview({
      bytes: fixtureBytes("renault.csv"),
      existingTxns: [],
      recurring: [],
      getRememberedPreset: async (bank) =>
        bank === "Renault" ? remembered : null,
    });

    expect(preview.bank).toBe("Renault");
    expect(preview.mapping.description).toBe("Verwendungszweck");
    // The credit row's description now reads its Verwendungszweck, not the
    // Buchungstext label — proof the remembered mapping drove the map.
    expect(
      preview.rows.some((r) => r.description === "Sparuebertrag Maerz")
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// AC7 — no guessed presets or their fixtures remain in the repo
// ---------------------------------------------------------------------------

describe("repo hygiene — guessed fixtures are gone", () => {
  it("keeps none of the guessed dkb/ing/fictional-sparkasse fixtures", () => {
    for (const name of ["dkb.csv", "ing.csv", "sparkasse.csv"]) {
      expect(existsSync(fixturePath(name))).toBe(false);
    }
  });

  it("registers only the four real presets, plus a non-bank generic fallback", () => {
    expect(Object.keys(BANK_PRESETS).sort()).toEqual([
      "PostbankCC",
      "PostbankGiro",
      "Renault",
      "Sparkasse",
    ]);
    expect(BANK_PRESETS.DKB).toBeUndefined();
    expect(BANK_PRESETS.ING).toBeUndefined();
    expect(BANK_PRESETS[DEFAULT_BANK]).toBeUndefined();
  });
});

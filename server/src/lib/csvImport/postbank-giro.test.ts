import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";
import { buildPreview } from "./buildPreview.js";
import { BANK_PRESETS } from "./bankPresets.js";
import { parseDate } from "./parse.js";
import type { StoredImportPreset } from "../../storage/types.js";

// ---------------------------------------------------------------------------
// Issue #151 — Real Postbank (Girokonto) CSV import, end-to-end.
//
// Adds the Postbank giro format on top of the real Sparkasse preset (#150):
//   - unquoted, ';'-delimited, D.M.YYYY (single-digit day/month) dates,
//     decimal comma, signed Betrag (used directly, no inversion)
//   - signature: Umsatzart, Soll, Haben
//   - map: date Buchungstag, description "Begünstigter / Auftraggeber",
//     amount signed Betrag (the redundant Soll/Haben pair is ignored)
//   - no pending column
//
// Two engine hardenings ride along and are asserted through the public
// surface: parseDate zero-pads single-digit day/month (1.9.2026 → 2026-09-01),
// and detectStatement gains the signature-driven encoding retry so the umlaut
// header ("Begünstigter / Auftraggeber") decodes correctly whether the file is
// Windows-1252 or UTF-8 without a BOM. Behaviour is asserted through the public
// buildPreview / parseDate surface and the anonymized fixture — never private
// helpers.
// ---------------------------------------------------------------------------

const FIXTURE = "postbank-giro.csv";

/** The anonymized fixture as shipped: Windows-1252 bytes, no BOM. */
function fixtureBytes(name: string): Uint8Array {
  return readFileSync(
    fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url))
  );
}

/** The fixture's text, decoded from its native Windows-1252 bytes. */
function fixtureText(name: string): string {
  return new TextDecoder("windows-1252").decode(fixtureBytes(name));
}

const UTF8_BOM = Uint8Array.from([0xef, 0xbb, 0xbf]);

/** Same statement, re-encoded UTF-8 without a BOM. */
function asUtf8NoBom(name: string): Uint8Array {
  return new TextEncoder().encode(fixtureText(name));
}

/** Same statement, re-encoded UTF-8 with a leading BOM. */
function asUtf8WithBom(name: string): Uint8Array {
  const body = asUtf8NoBom(name);
  const out = new Uint8Array(UTF8_BOM.length + body.length);
  out.set(UTF8_BOM, 0);
  out.set(body, UTF8_BOM.length);
  return out;
}

/** Same statement, mis-tagged: Windows-1252 bytes with a UTF-8 BOM prepended. */
function windows1252WithUtf8Bom(name: string): Uint8Array {
  const body = fixtureBytes(name);
  const out = new Uint8Array(UTF8_BOM.length + body.length);
  out.set(UTF8_BOM, 0);
  out.set(body, UTF8_BOM.length);
  return out;
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
// BANK_PRESETS — the real Postbank giro preset is added alongside Sparkasse
// ---------------------------------------------------------------------------

describe("BANK_PRESETS — Postbank giro added", () => {
  it("registers PostbankGiro alongside the real Sparkasse preset", () => {
    expect(Object.keys(BANK_PRESETS)).toEqual(
      expect.arrayContaining(["Sparkasse", "PostbankGiro"])
    );
  });

  it("maps the real Postbank giro columns and carries the unquoted shape", () => {
    const preset = BANK_PRESETS.PostbankGiro;

    expect(preset.map).toEqual({
      date: "Buchungstag",
      description: "Begünstigter / Auftraggeber",
      amount: "Betrag",
    });
    expect(preset.dateFmt).toBe("DD.MM.YYYY");
    expect(preset.decimal).toBe(",");
    expect(preset.delimiter).toBe(";");
    // Postbank exports are unquoted — the quoted flag must be absent/false.
    expect(preset.quoted ?? false).toBe(false);
    expect(preset.headerSignature).toEqual(
      expect.arrayContaining(["Umsatzart", "Soll", "Haben"])
    );
    // Postbank giro has no pending marker.
    expect(preset.pendingColumn).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// parseDate — single-digit day/month zero-padding (D.M.YYYY)
// ---------------------------------------------------------------------------

describe("parseDate — single-digit day/month padding", () => {
  it("zero-pads a single-digit day/month and leaves two-digit values unchanged", () => {
    expect(parseDate("1.9.2026", "DD.MM.YYYY")).toBe("2026-09-01");
    expect(parseDate("3.10.2026", "DD.MM.YYYY")).toBe("2026-10-03");
    expect(parseDate("12.9.2026", "DD.MM.YYYY")).toBe("2026-09-12");
    // Already two-digit day/month must pass through untouched (regression guard).
    expect(parseDate("15.10.2026", "DD.MM.YYYY")).toBe("2026-10-15");
  });

  it("still pads while expanding a 2-digit year (regression guard)", () => {
    expect(parseDate("1.9.26", "DD.MM.YY")).toBe("2026-09-01");
  });
});

// ---------------------------------------------------------------------------
// Detection + end-to-end import of the anonymized Postbank giro fixture
// ---------------------------------------------------------------------------

describe("buildPreview — Postbank giro fixture (Windows-1252)", () => {
  it("detects PostbankGiro by its signature and returns the real mapping", async () => {
    const result = await preview(fixtureBytes(FIXTURE));

    expect(result.bank).toBe("PostbankGiro");
    expect(result.mapping).toEqual({
      date: "Buchungstag",
      description: "Begünstigter / Auftraggeber",
      amount: "Betrag",
    });
    expect(result.dateFmt).toBe("DD.MM.YYYY");
    expect(result.columns).toEqual(
      expect.arrayContaining([
        "Umsatzart",
        "Soll",
        "Haben",
        "Buchungstag",
        "Begünstigter / Auftraggeber",
        "Betrag",
      ])
    );
  });

  it("maps single-digit-day/month dates, signed amounts, and Begünstigter descriptions", async () => {
    const result = await preview(fixtureBytes(FIXTURE));

    const supermarkt = result.rows.find(
      (r) => r.description === "MUSTER SUPERMARKT GMBH"
    );
    expect(supermarkt).toMatchObject({
      date: "2026-09-01",
      amount: -2041,
      pending: false,
    });

    const dienst = result.rows.find((r) => r.description === "MÜLLER BÄCKEREI");
    expect(dienst).toMatchObject({ date: "2026-10-03", amount: -990 });
  });

  it("imports a positive credit with its sign preserved (no inversion)", async () => {
    const result = await preview(fixtureBytes(FIXTURE));

    const gehalt = result.rows.find(
      (r) => r.description === "ARBEITGEBER MUSTER AG"
    );
    expect(gehalt).toMatchObject({ date: "2026-09-12", amount: 250000 });
  });

  it("ignores the redundant Soll/Haben pair — signed Betrag is the only amount source", async () => {
    const result = await preview(fixtureBytes(FIXTURE));

    // Soll on the supermarkt row is the positive 20,41; using it would flip the
    // sign to +2041. The signed Betrag (-20,41) must win.
    const supermarkt = result.rows.find(
      (r) => r.description === "MUSTER SUPERMARKT GMBH"
    );
    expect(supermarkt?.amount).toBe(-2041);
    expect(supermarkt?.amount).not.toBe(2041);

    const strom = result.rows.find((r) => r.description === "MUSTER STROM AG");
    expect(strom).toMatchObject({ date: "2026-10-15", amount: -7500 });
  });

  it("skips the empty-date Endsaldo footer without counting it rejected", async () => {
    const result = await preview(fixtureBytes(FIXTURE));

    // Four real transactions; the dateless Endsaldo footer is dropped silently.
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

// ---------------------------------------------------------------------------
// Signature-driven encoding retry — the umlaut header decodes under either
// no-BOM encoding, and a UTF-8 BOM is authoritative.
// ---------------------------------------------------------------------------

describe("buildPreview — Postbank giro encoding retry", () => {
  it("decodes the umlaut header from a no-BOM Windows-1252 file", async () => {
    const result = await preview(fixtureBytes(FIXTURE));

    expect(result.bank).toBe("PostbankGiro");
    expect(result.columns).toContain("Begünstigter / Auftraggeber");
    // A wrong decode would surface no description column, leaving rows blank.
    expect(result.rows.some((r) => r.description === "MÜLLER BÄCKEREI")).toBe(
      true
    );
  });

  it("decodes the umlaut header from a no-BOM UTF-8 file via the retry", async () => {
    const result = await preview(asUtf8NoBom(FIXTURE));

    expect(result.bank).toBe("PostbankGiro");
    expect(result.columns).toContain("Begünstigter / Auftraggeber");
    expect(result.rows.some((r) => r.description === "MÜLLER BÄCKEREI")).toBe(
      true
    );
    // The counterparty itself carries umlauts — proof the row body, not just
    // the ASCII signature, decoded correctly.
    const dienst = result.rows.find((r) => r.description === "MÜLLER BÄCKEREI");
    expect(dienst).toMatchObject({ date: "2026-10-03", amount: -990 });
  });

  it("decodes a UTF-8 BOM file as UTF-8 authoritatively", async () => {
    const result = await preview(asUtf8WithBom(FIXTURE));

    expect(result.bank).toBe("PostbankGiro");
    expect(result.columns).toContain("Begünstigter / Auftraggeber");
    // The BOM must not leak into the first header cell.
    expect(result.columns[0]).toBe("Buchungstag");
    expect(result.rows.some((r) => r.description === "MÜLLER BÄCKEREI")).toBe(
      true
    );
  });

  it("treats a UTF-8 BOM as authoritative even over Windows-1252 bytes", async () => {
    // A BOM claims UTF-8; the retry is skipped. Windows-1252 umlaut bytes are
    // not valid UTF-8, so the umlaut column will not round-trip — detection
    // must not silently fall back to the Windows-1252 reading of a BOM'd file.
    const result = await preview(windows1252WithUtf8Bom(FIXTURE));

    // The row bodies cannot decode cleanly under UTF-8, so PostbankGiro's
    // umlaut-bearing description column is absent — the file is NOT claimed as
    // a correctly-decoded Postbank giro statement.
    expect(result.rows.some((r) => r.description === "MÜLLER BÄCKEREI")).toBe(
      false
    );
  });
});

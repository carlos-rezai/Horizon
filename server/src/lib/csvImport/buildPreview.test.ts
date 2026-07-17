import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";
import { buildPreview } from "./buildPreview.js";
import type { StoredImportPreset } from "../../storage/types.js";
import type { Transaction, RecurringTransaction } from "../../storage/types.js";

// buildPreview is the pure orchestration core behind POST /imports/preview:
// detect → re-apply remembered mapping → map rows → flag dup/recurring →
// assign ids → summarise. Tested through inputs/outputs against the real bank
// fixtures, never by reaching into the parse/detect helpers it composes.

function fixtureBytes(name: string): Uint8Array {
  return readFileSync(
    fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url))
  );
}

/**
 * Encode hand-built synthetic statement text with a UTF-8 BOM so the engine's
 * encoding sniff resolves to UTF-8 — lets a test isolate a rail without a
 * fixture file.
 */
function bytesOf(text: string): Uint8Array {
  const utf8Bom = String.fromCharCode(0xfeff);
  return new TextEncoder().encode(utf8Bom + text);
}

/** A deterministic id generator: r0, r1, r2, … so row ids are assertable. */
function sequentialIds(): () => string {
  let n = 0;
  return () => `r${n++}`;
}

const noPreset = async (): Promise<StoredImportPreset | null> => null;

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
    amount: -15000,
    description: "Sparplan ETF",
    category: "Investment",
    frequency: "monthly",
    dayOfMonth: 4,
    ...overrides,
  };
}

describe("buildPreview", () => {
  it("detects the bank, assigns injected ids, and summarises", async () => {
    const preview = await buildPreview({
      bytes: fixtureBytes("sparkasse-giro.csv"),
      existingTxns: [],
      recurring: [],
      getRememberedPreset: noPreset,
      generateId: sequentialIds(),
    });

    expect(preview.bank).toBe("Sparkasse");
    // Four transactions survive; the dateless footer is dropped, one is pending.
    expect(preview.rows.map((r) => r.id)).toEqual(["r0", "r1", "r2", "r3"]);
    expect(preview.summary).toEqual({
      total: 4,
      duplicates: 0,
      recurring: 0,
      pending: 1,
      rejected: { count: 0, samples: [] },
    });
  });

  it("maps rows to signed cents and ISO dates, assigns ids, and auto-categorizes", async () => {
    const preview = await buildPreview({
      bytes: fixtureBytes("sparkasse-giro.csv"),
      existingTxns: [],
      recurring: [],
      getRememberedPreset: noPreset,
      generateId: sequentialIds(),
    });

    const supermarkt = preview.rows.find(
      (r) => r.description === "MUSTER SUPERMARKT GMBH"
    );
    expect(supermarkt).toMatchObject({
      id: expect.any(String),
      date: "2026-06-24",
      amount: -2041,
      category: "Food",
      duplicate: false,
      recurring: false,
    });
    // Ids come from the injected generator.
    expect(preview.rows.map((r) => r.id)).toEqual(["r0", "r1", "r2", "r3"]);
  });

  it("flags a row that duplicates an existing account transaction", async () => {
    const preview = await buildPreview({
      bytes: fixtureBytes("sparkasse-giro.csv"),
      existingTxns: [
        makeTxn({
          id: "t1",
          date: "2026-06-24",
          amount: -2041,
          description: "MUSTER SUPERMARKT GMBH",
        }),
      ],
      recurring: [],
      getRememberedPreset: noPreset,
    });

    const supermarkt = preview.rows.find(
      (r) => r.description === "MUSTER SUPERMARKT GMBH"
    );
    expect(supermarkt?.duplicate).toBe(true);
    expect(preview.summary.duplicates).toBe(1);
    // The duplicate is still present — the user may re-include it.
    expect(preview.rows).toHaveLength(4);
  });

  it("flags a row matching an existing recurring transaction", async () => {
    const preview = await buildPreview({
      bytes: fixtureBytes("sparkasse-giro.csv"),
      existingTxns: [],
      recurring: [
        makeRecurring({
          id: "r1",
          description: "MUSTER DIENST GMBH",
          amount: -990,
        }),
      ],
      getRememberedPreset: noPreset,
    });

    const dienst = preview.rows.find(
      (r) => r.description === "MUSTER DIENST GMBH"
    );
    expect(dienst?.recurring).toBe(true);
    expect(preview.summary.recurring).toBe(1);
  });

  it("re-applies a bank's remembered mapping and echoes its full format", async () => {
    const remembered: StoredImportPreset = {
      mapping: {
        date: "Buchungstag",
        description: "Verwendungszweck",
        amount: "Betrag",
      },
      delimiter: ";",
      decimal: ",",
      dateFmt: "DD.MM.YY",
    };

    const preview = await buildPreview({
      bytes: fixtureBytes("sparkasse-giro.csv"),
      existingTxns: [],
      recurring: [],
      getRememberedPreset: async (bank) =>
        bank === "Sparkasse" ? remembered : null,
    });

    expect(preview.mapping).toEqual(remembered.mapping);
    expect(preview.delimiter).toBe(";");
    expect(preview.decimal).toBe(",");
    expect(preview.dateFmt).toBe("DD.MM.YY");
    // Description now reads the remembered Verwendungszweck, not the detected
    // Beguenstigter/Zahlungspflichtiger counterparty.
    expect(preview.rows[0].description).toBe("Einkauf Lebensmittel Filiale 12");
  });

  it("applies a remembered decimal separator when parsing amounts", async () => {
    const remembered: StoredImportPreset = {
      mapping: {
        date: "Buchungstag",
        description: "Beguenstigter/Zahlungspflichtiger",
        amount: "Betrag",
      },
      delimiter: ";",
      decimal: ".",
      dateFmt: "DD.MM.YY",
    };

    const preview = await buildPreview({
      bytes: fixtureBytes("sparkasse-giro.csv"),
      existingTxns: [],
      recurring: [],
      getRememberedPreset: async () => remembered,
    });

    // With the remembered decimal ".", "-20,41" reads as -2041.00 → -204100
    // cents — proof the remembered format, not the detected ",", drove parsing.
    const supermarkt = preview.rows.find(
      (r) => r.description === "MUSTER SUPERMARKT GMBH"
    );
    expect(supermarkt?.amount).toBe(-204100);
    expect(preview.decimal).toBe(".");
  });

  it("falls back to an adjustable mapping when the bank is unmatched", async () => {
    const preview = await buildPreview({
      bytes: fixtureBytes("windows1252-umlauts.csv"),
      existingTxns: [],
      recurring: [],
      getRememberedPreset: noPreset,
    });

    expect(preview.columns).toContain("Buchungsdatum");
    expect(typeof preview.mapping.date).toBe("string");
    expect(typeof preview.mapping.description).toBe("string");
    expect(typeof preview.mapping.amount).toBe("string");
  });

  it("skips an empty-date footer and reports an unparseable row as rejected in the summary", async () => {
    const csv = [
      "Datum;Beschreibung;Betrag",
      "02.11.2026;REWE SAGT DANKE;-12,50",
      ";Saldo zum 30.11.2026;1.234,56",
      "not-a-date;Kaputt;-9,99",
    ].join("\n");

    const preview = await buildPreview({
      bytes: bytesOf(csv),
      existingTxns: [],
      recurring: [],
      getRememberedPreset: noPreset,
      generateId: sequentialIds(),
    });

    // Only the one real transaction is emitted: the dateless footer is dropped
    // silently and the junk-date row is rejected — both kept out of `rows`, but
    // the rejected one is surfaced as a count rather than lost.
    expect(preview.rows).toHaveLength(1);
    expect(preview.rows[0].description).toBe("REWE SAGT DANKE");
    expect(preview.summary.total).toBe(1);
    expect(preview.summary.rejected).toEqual({
      count: 1,
      samples: [{ date: "not-a-date", amount: "-9,99" }],
    });
  });

  it("threads the rejected samples end-to-end so the wizard can show the raw cells", async () => {
    // Every row's date is ISO while the generic fallback reads DD.MM.YYYY —
    // the shape of a wrong mapping, where the samples are the diagnosis.
    const csv = [
      "Datum;Beschreibung;Betrag",
      ...Array.from(
        { length: 6 },
        (_, i) => `2026-11-0${i + 1};Zahlung ${i};-1${i},50`
      ),
    ].join("\n");

    const preview = await buildPreview({
      bytes: bytesOf(csv),
      existingTxns: [],
      recurring: [],
      getRememberedPreset: noPreset,
      generateId: sequentialIds(),
    });

    expect(preview.rows).toHaveLength(0);
    expect(preview.summary.rejected.count).toBe(6);
    expect(preview.summary.rejected.samples).toHaveLength(5);
    expect(preview.summary.rejected.samples[0]).toEqual({
      date: "2026-11-01",
      amount: "-10,50",
    });
  });

  it("threads a pending count and a per-row pending flag through the summary", async () => {
    // Postbank giro carries no pendingColumn, so every row is settled — but the
    // flag and the count must thread through end-to-end regardless.
    const preview = await buildPreview({
      bytes: fixtureBytes("postbank-giro.csv"),
      existingTxns: [],
      recurring: [],
      getRememberedPreset: noPreset,
    });

    expect(preview.summary.pending).toBe(0);
    expect(preview.rows.every((r) => r.pending === false)).toBe(true);
  });

  it("still rejects a file whose column count exceeds MAX_COLUMNS", async () => {
    const header = Array.from({ length: 60 }, (_, i) => `Col${i}`).join(";");

    await expect(
      buildPreview({
        bytes: bytesOf(header + "\n"),
        existingTxns: [],
        recurring: [],
        getRememberedPreset: noPreset,
      })
    ).rejects.toThrow(/Too many columns/);
  });
});

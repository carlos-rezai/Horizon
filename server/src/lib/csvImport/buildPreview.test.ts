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
  it("detects the bank and returns mapping, columns, rows, and summary", async () => {
    const preview = await buildPreview({
      bytes: fixtureBytes("dkb.csv"),
      existingTxns: [],
      recurring: [],
      getRememberedPreset: noPreset,
      generateId: sequentialIds(),
    });

    expect(preview.bank).toBe("DKB");
    expect(preview.mapping).toEqual({
      date: "Buchungsdatum",
      description: "Verwendungszweck",
      amount: "Betrag (€)",
    });
    expect(preview.columns).toEqual([
      "Buchungsdatum",
      "Auftraggeber / Begünstigter",
      "Verwendungszweck",
      "Betrag (€)",
    ]);
    expect(preview.rows).toHaveLength(2);
    expect(preview.summary).toEqual({ total: 2, duplicates: 0, recurring: 0 });
  });

  it("maps rows to signed cents and ISO dates, assigns ids, and auto-categorizes", async () => {
    const preview = await buildPreview({
      bytes: fixtureBytes("dkb.csv"),
      existingTxns: [],
      recurring: [],
      getRememberedPreset: noPreset,
      generateId: sequentialIds(),
    });

    const edeka = preview.rows.find(
      (r) => r.description === "Lebensmittel EDEKA"
    );
    expect(edeka).toMatchObject({
      id: expect.any(String),
      date: "2026-11-03",
      amount: -3420,
      category: "Food",
      duplicate: false,
      recurring: false,
    });
    // Ids come from the injected generator.
    expect(preview.rows.map((r) => r.id)).toEqual(["r0", "r1"]);
  });

  it("preserves the sign of a positive credit (Gehalt stays positive)", async () => {
    const preview = await buildPreview({
      bytes: fixtureBytes("sparkasse.csv"),
      existingTxns: [],
      recurring: [],
      getRememberedPreset: noPreset,
    });

    expect(preview.bank).toBe("Sparkasse");
    const gehalt = preview.rows.find((r) => r.description === "Gehalt Oktober");
    expect(gehalt).toMatchObject({ amount: 250000, category: "Income" });
  });

  it("flags a row that duplicates an existing account transaction", async () => {
    const preview = await buildPreview({
      bytes: fixtureBytes("dkb.csv"),
      existingTxns: [
        makeTxn({
          id: "t1",
          date: "2026-11-03",
          amount: -3420,
          description: "Lebensmittel EDEKA",
        }),
      ],
      recurring: [],
      getRememberedPreset: noPreset,
    });

    const edeka = preview.rows.find(
      (r) => r.description === "Lebensmittel EDEKA"
    );
    expect(edeka?.duplicate).toBe(true);
    expect(preview.summary.duplicates).toBe(1);
    // The duplicate is still present — the user may re-include it.
    expect(preview.rows).toHaveLength(2);
  });

  it("flags a row matching an existing recurring transaction", async () => {
    const preview = await buildPreview({
      bytes: fixtureBytes("dkb.csv"),
      existingTxns: [],
      recurring: [makeRecurring({ id: "r1" })],
      getRememberedPreset: noPreset,
    });

    const etf = preview.rows.find(
      (r) => r.description === "Sparplan ETF MSCI World"
    );
    expect(etf?.recurring).toBe(true);
    expect(preview.summary.recurring).toBe(1);
  });

  it("re-applies a bank's remembered mapping and echoes its full format", async () => {
    const remembered: StoredImportPreset = {
      mapping: {
        date: "Buchungsdatum",
        description: "Auftraggeber / Begünstigter",
        amount: "Betrag (€)",
      },
      delimiter: ";",
      decimal: ",",
      dateFmt: "DD.MM.YYYY",
    };

    const preview = await buildPreview({
      bytes: fixtureBytes("dkb.csv"),
      existingTxns: [],
      recurring: [],
      getRememberedPreset: async (bank) => (bank === "DKB" ? remembered : null),
    });

    expect(preview.mapping).toEqual(remembered.mapping);
    expect(preview.delimiter).toBe(";");
    expect(preview.decimal).toBe(",");
    expect(preview.dateFmt).toBe("DD.MM.YYYY");
    // Description now reads from the remembered column, not the detected one.
    expect(preview.rows[0].description).not.toBe("Lebensmittel EDEKA");
  });

  it("applies a remembered decimal separator when parsing amounts", async () => {
    const remembered: StoredImportPreset = {
      mapping: {
        date: "Buchungsdatum",
        description: "Verwendungszweck",
        amount: "Betrag (€)",
      },
      delimiter: ";",
      decimal: ".",
      dateFmt: "DD.MM.YYYY",
    };

    const preview = await buildPreview({
      bytes: fixtureBytes("dkb.csv"),
      existingTxns: [],
      recurring: [],
      getRememberedPreset: async () => remembered,
    });

    // With the remembered decimal ".", "-34,20" reads as -3420.00 → -342000
    // cents — proof the remembered format, not the detected ",", drove parsing.
    const edeka = preview.rows.find(
      (r) => r.description === "Lebensmittel EDEKA"
    );
    expect(edeka?.amount).toBe(-342000);
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
});

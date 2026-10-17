import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";
import { buildPreview } from "./buildPreview.js";
import type { ColumnMapping, StoredImportPreset } from "../../storage/types.js";
import type {
  Category,
  Transaction,
  RecurringTransaction,
} from "../../storage/types.js";
import { counterpartyKey } from "./counterpartyKey.js";

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

  it("maps rows to signed cents and ISO dates, assigns ids, and leaves an unknown payee in Miscellaneous", async () => {
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
      // No Category Rule and no keyword list: the cold start is Miscellaneous.
      category: "Miscellaneous",
      categorySource: "unmatched",
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

  // Phase 5b: the Map-columns step's mapping override reaches the preview.
  // Precedence is override ?? remembered ?? detected — the override wins so a
  // correction the user makes in step 2 re-maps the very rows they're reviewing.
  describe("mapping override", () => {
    const rememberedSparkasse: StoredImportPreset = {
      mapping: {
        date: "Buchungstag",
        description: "Verwendungszweck",
        amount: "Betrag",
      },
      delimiter: ";",
      decimal: ",",
      dateFmt: "DD.MM.YY",
    };

    it("lets an override win over a remembered preset", async () => {
      // Remembered reads Verwendungszweck; the override reads Buchungstext.
      // The override must win — mapping echoed and rows re-columned from it.
      const override: ColumnMapping = {
        date: "Buchungstag",
        description: "Buchungstext",
        amount: "Betrag",
      };

      const preview = await buildPreview({
        bytes: fixtureBytes("sparkasse-giro.csv"),
        existingTxns: [],
        recurring: [],
        getRememberedPreset: async () => rememberedSparkasse,
        mappingOverride: override,
      });

      expect(preview.mapping).toEqual(override);
      // Buchungstext of the first booking is "FOLGELASTSCHRIFT" — neither the
      // remembered Verwendungszweck nor the detected counterparty column.
      expect(preview.rows[0].description).toBe("FOLGELASTSCHRIFT");
    });

    it("re-maps the emitted rows from the override's columns", async () => {
      // Detected Sparkasse description is Beguenstigter/Zahlungspflichtiger
      // ("MUSTER SUPERMARKT GMBH"). Override it to Verwendungszweck and the
      // same row's description must switch to the override's column.
      const override: ColumnMapping = {
        date: "Buchungstag",
        description: "Verwendungszweck",
        amount: "Betrag",
      };

      const preview = await buildPreview({
        bytes: fixtureBytes("sparkasse-giro.csv"),
        existingTxns: [],
        recurring: [],
        getRememberedPreset: noPreset,
        mappingOverride: override,
      });

      expect(preview.mapping).toEqual(override);
      expect(preview.rows[0].description).toBe(
        "Einkauf Lebensmittel Filiale 12"
      );
      // The detected counterparty column no longer drives any row.
      expect(
        preview.rows.some((r) => r.description === "MUSTER SUPERMARKT GMBH")
      ).toBe(false);
    });

    it("falls back to the remembered preset when no override is given", async () => {
      // No override: today's behaviour is unchanged — remembered still wins.
      const preview = await buildPreview({
        bytes: fixtureBytes("sparkasse-giro.csv"),
        existingTxns: [],
        recurring: [],
        getRememberedPreset: async () => rememberedSparkasse,
      });

      expect(preview.mapping).toEqual(rememberedSparkasse.mapping);
      expect(preview.rows[0].description).toBe(
        "Einkauf Lebensmittel Filiale 12"
      );
    });

    it("falls back to the detected mapping when neither override nor preset is given", async () => {
      // No override, no remembered: detected mapping drives, exactly as now.
      const preview = await buildPreview({
        bytes: fixtureBytes("sparkasse-giro.csv"),
        existingTxns: [],
        recurring: [],
        getRememberedPreset: noPreset,
      });

      expect(preview.mapping).toEqual({
        date: "Buchungstag",
        description: "Beguenstigter/Zahlungspflichtiger",
        amount: "Betrag",
      });
      expect(preview.rows[0].description).toBe("MUSTER SUPERMARKT GMBH");
    });
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

// ---------------------------------------------------------------------------
// Issue #234 — Balance Anchor: no recurring flag on or before the anchor.
// The Anchor Balance already contains every row dated on or before the Anchor
// Date (end-of-day semantics), and the Anchor Gate means no RecurringTransaction
// replays them, so Recurring Detection must not pre-uncheck those rows. Rows
// after the anchor are flagged exactly as before.
// The Sparkasse fixture holds Gehalt (+2.500,00) on 2026-06-05 and
// MUSTER DIENST GMBH (-9,90) on 2026-06-10.
// ---------------------------------------------------------------------------

describe("buildPreview — recurring detection respects the Anchor Date", () => {
  const dienstRule = makeRecurring({
    id: "rDienst",
    description: "MUSTER DIENST GMBH",
    amount: -990,
  });
  const gehaltRule = makeRecurring({
    id: "rGehalt",
    description: "ARBEITGEBER MUSTER AG",
    amount: 250000,
    category: "Income",
  });

  it("does not flag a matching row dated before the anchor date", async () => {
    const preview = await buildPreview({
      bytes: fixtureBytes("sparkasse-giro.csv"),
      existingTxns: [],
      recurring: [dienstRule],
      anchorDate: "2026-06-30",
      getRememberedPreset: noPreset,
    });

    const dienst = preview.rows.find(
      (r) => r.description === "MUSTER DIENST GMBH"
    );
    expect(dienst?.recurring).toBe(false);
    expect(preview.summary.recurring).toBe(0);
  });

  it("does not flag a matching row dated on the anchor date itself", async () => {
    const preview = await buildPreview({
      bytes: fixtureBytes("sparkasse-giro.csv"),
      existingTxns: [],
      recurring: [dienstRule],
      anchorDate: "2026-06-10",
      getRememberedPreset: noPreset,
    });

    const dienst = preview.rows.find(
      (r) => r.description === "MUSTER DIENST GMBH"
    );
    expect(dienst?.recurring).toBe(false);
    expect(preview.summary.recurring).toBe(0);
  });

  it("still flags a matching row dated after the anchor date, while one before it is not", async () => {
    const preview = await buildPreview({
      bytes: fixtureBytes("sparkasse-giro.csv"),
      existingTxns: [],
      recurring: [gehaltRule, dienstRule],
      anchorDate: "2026-06-07",
      getRememberedPreset: noPreset,
    });

    const gehalt = preview.rows.find(
      (r) => r.description === "ARBEITGEBER MUSTER AG"
    );
    const dienst = preview.rows.find(
      (r) => r.description === "MUSTER DIENST GMBH"
    );
    expect(gehalt?.recurring).toBe(false);
    expect(dienst?.recurring).toBe(true);
    expect(preview.summary.recurring).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Issue #258 — Import Category Learning, Phase 1: learn and apply.
// Statement mapping records each row's Counterparty (the description cell for
// every preset and for generic CSVs); the preview derives its Counterparty Key
// and applies a previously learned Category Rule as `learned`. Every other row
// is Miscellaneous / `unmatched` — the hardcoded keyword list is retired.
// The Category Rules and categories are injected as plain data, like
// existingTxns and recurring.
// ---------------------------------------------------------------------------

function makeCategory(
  overrides: Partial<Category> & { id: string; name: string }
): Category {
  return {
    isDefault: true,
    color: "#74C29B",
    hidden: false,
    ...overrides,
  };
}

const defaultCategories: Category[] = [
  makeCategory({ id: "c-food", name: "Food" }),
  makeCategory({ id: "c-income", name: "Income" }),
  makeCategory({ id: "c-housing", name: "Housing" }),
  makeCategory({ id: "c-subs", name: "Subscriptions" }),
  makeCategory({ id: "c-misc", name: "Miscellaneous" }),
];

describe("buildPreview — Counterparty and Category Rules (#258)", () => {
  // Renault gains a preset-only Counterparty Column in a later slice, so its
  // counterparty is deliberately left out of this description-cell contract.
  it.each([
    "sparkasse-giro.csv",
    "postbank-giro.csv",
    "postbank-cc.csv",
    "windows1252-umlauts.csv",
  ])(
    "records each %s row's counterparty from its description cell",
    async (name) => {
      const preview = await buildPreview({
        bytes: fixtureBytes(name),
        existingTxns: [],
        recurring: [],
        categoryRules: [],
        categories: defaultCategories,
        getRememberedPreset: noPreset,
      });

      expect(preview.rows.length).toBeGreaterThan(0);
      for (const row of preview.rows) {
        expect(row.counterparty).toBe(row.description);
      }
    }
  );

  it("records the counterparty of a generic CSV from its description cell", async () => {
    const preview = await buildPreview({
      bytes: bytesOf(
        "Datum;Beschreibung;Betrag\n24.06.2026;REWE Markt 0815;-12,50\n"
      ),
      existingTxns: [],
      recurring: [],
      categoryRules: [],
      categories: defaultCategories,
      getRememberedPreset: noPreset,
    });

    expect(preview.rows).toHaveLength(1);
    expect(preview.rows[0].counterparty).toBe(preview.rows[0].description);
    expect(preview.rows[0].counterparty).toBe("REWE Markt 0815");
  });

  it("applies a learned Category Rule to the row whose key it names, as learned", async () => {
    const preview = await buildPreview({
      bytes: fixtureBytes("sparkasse-giro.csv"),
      existingTxns: [],
      recurring: [],
      categoryRules: [
        {
          counterpartyKey: counterpartyKey("MUSTER SUPERMARKT GMBH"),
          category: "Food",
        },
      ],
      categories: defaultCategories,
      getRememberedPreset: noPreset,
    });

    const supermarkt = preview.rows.find(
      (r) => r.description === "MUSTER SUPERMARKT GMBH"
    );
    expect(supermarkt).toMatchObject({
      counterparty: "MUSTER SUPERMARKT GMBH",
      category: "Food",
      categorySource: "learned",
    });
  });

  it("leaves every row without a Category Rule in Miscellaneous, unmatched", async () => {
    // Only a hidden Food and Miscellaneous exist, so no Keyword Group can
    // suggest anything (#260) and the fallback alone is under test.
    const preview = await buildPreview({
      bytes: fixtureBytes("sparkasse-giro.csv"),
      existingTxns: [],
      recurring: [],
      categoryRules: [
        {
          counterpartyKey: counterpartyKey("MUSTER SUPERMARKT GMBH"),
          category: "Food",
        },
      ],
      categories: [
        makeCategory({ id: "c-food", name: "Food", hidden: true }),
        makeCategory({ id: "c-misc", name: "Miscellaneous" }),
      ],
      getRememberedPreset: noPreset,
    });

    const others = preview.rows.filter(
      (r) => r.description !== "MUSTER SUPERMARKT GMBH"
    );
    expect(others).toHaveLength(3);
    for (const row of others) {
      expect(row).toMatchObject({
        category: "Miscellaneous",
        categorySource: "unmatched",
      });
    }
  });

  it("honours a Category Rule into a Hidden Category", async () => {
    const categories = [
      ...defaultCategories.filter((c) => c.name !== "Housing"),
      makeCategory({ id: "c-housing", name: "Housing", hidden: true }),
    ];
    const preview = await buildPreview({
      bytes: fixtureBytes("sparkasse-giro.csv"),
      existingTxns: [],
      recurring: [],
      categoryRules: [
        {
          counterpartyKey: counterpartyKey("MUSTER DIENST GMBH"),
          category: "Housing",
        },
      ],
      categories,
      getRememberedPreset: noPreset,
    });

    const dienst = preview.rows.find(
      (r) => r.description === "MUSTER DIENST GMBH"
    );
    expect(dienst).toMatchObject({
      category: "Housing",
      categorySource: "learned",
    });
  });

  it("matches a Category Rule by key, so a noisy spelling of the payee still finds it", async () => {
    const preview = await buildPreview({
      bytes: bytesOf(
        "Datum;Beschreibung;Betrag\n24.06.2026;Muster Supermarkt GmbH 0815;-12,50\n"
      ),
      existingTxns: [],
      recurring: [],
      categoryRules: [
        {
          counterpartyKey: counterpartyKey("MUSTER SUPERMARKT GMBH"),
          category: "Food",
        },
      ],
      categories: defaultCategories,
      getRememberedPreset: noPreset,
    });

    expect(preview.rows[0]).toMatchObject({
      category: "Food",
      categorySource: "learned",
    });
  });

  it("leaves the summary shape unchanged", async () => {
    const preview = await buildPreview({
      bytes: fixtureBytes("sparkasse-giro.csv"),
      existingTxns: [],
      recurring: [],
      categoryRules: [],
      categories: defaultCategories,
      getRememberedPreset: noPreset,
    });

    expect(Object.keys(preview.summary).sort()).toEqual(
      ["duplicates", "pending", "recurring", "rejected", "total"].sort()
    );
  });
});

// ---------------------------------------------------------------------------
// Issue #260 — Keyword Groups. With no Category Rule for a row, buildPreview
// suggests the user's visible category for the first matching Keyword Group.
// The keyword lists are a build detail; REWE (Groceries) and Netflix
// (Subscriptions) are unmistakable payees any vocabulary carries.
// ---------------------------------------------------------------------------

const KEYWORD_CSV =
  "Datum;Beschreibung;Betrag\n" +
  "24.06.2026;REWE Markt 0815;-12,50\n" +
  "25.06.2026;NETFLIX.COM;-13,99\n" +
  "26.06.2026;MUSTER DIENST GMBH;-9,90\n";

describe("buildPreview — Keyword Groups (#260)", () => {
  it("suggests a visible category for a keyword hit and leaves the rest unmatched", async () => {
    const preview = await buildPreview({
      bytes: bytesOf(KEYWORD_CSV),
      existingTxns: [],
      recurring: [],
      categoryRules: [],
      categories: defaultCategories,
      getRememberedPreset: noPreset,
    });

    const byDescription = (d: string) =>
      preview.rows.find((r) => r.description === d);
    expect(byDescription("REWE Markt 0815")).toMatchObject({
      category: "Food",
      categorySource: "suggested",
    });
    expect(byDescription("NETFLIX.COM")).toMatchObject({
      category: "Subscriptions",
      categorySource: "suggested",
    });
    expect(byDescription("MUSTER DIENST GMBH")).toMatchObject({
      category: "Miscellaneous",
      categorySource: "unmatched",
    });
  });

  it("never suggests a Hidden Category", async () => {
    const preview = await buildPreview({
      bytes: bytesOf(KEYWORD_CSV),
      existingTxns: [],
      recurring: [],
      categoryRules: [],
      categories: [
        ...defaultCategories.filter((c) => c.name !== "Subscriptions"),
        makeCategory({ id: "c-subs", name: "Subscriptions", hidden: true }),
      ],
      getRememberedPreset: noPreset,
    });

    expect(
      preview.rows.find((r) => r.description === "NETFLIX.COM")
    ).toMatchObject({
      category: "Miscellaneous",
      categorySource: "unmatched",
    });
    // Control: a visible category is still suggested in the same preview.
    expect(
      preview.rows.find((r) => r.description === "REWE Markt 0815")
    ).toMatchObject({ category: "Food", categorySource: "suggested" });
  });

  it("lets a Category Rule beat a keyword match", async () => {
    const preview = await buildPreview({
      bytes: bytesOf(KEYWORD_CSV),
      existingTxns: [],
      recurring: [],
      categoryRules: [
        {
          counterpartyKey: counterpartyKey("REWE Markt 0815"),
          category: "Housing",
        },
      ],
      categories: defaultCategories,
      getRememberedPreset: noPreset,
    });

    expect(
      preview.rows.find((r) => r.description === "REWE Markt 0815")
    ).toMatchObject({
      category: "Housing",
      categorySource: "learned",
    });
    // Control: a row without a Category Rule still gets its keyword match.
    expect(
      preview.rows.find((r) => r.description === "NETFLIX.COM")
    ).toMatchObject({ category: "Subscriptions", categorySource: "suggested" });
  });
});

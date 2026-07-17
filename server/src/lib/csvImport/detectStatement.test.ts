import { describe, expect, it } from "vitest";
import { mapStatementRows } from "./detectStatement.js";
import type { DetectedStatement } from "./detectStatement.js";
import type { ColumnMapping } from "../../storage/types.js";

// mapStatementRows is the seam where all three cross-cutting rails live:
//   - per-row `pending`, computed from the preset's pendingColumn/pendingValues
//   - the empty-date skip (blank lines and balance-footer rows)
//   - the rejected rail (a row with a non-empty date that fails parsing is
//     surfaced as a count plus capped raw samples, never silently dropped)
// Each rail is isolated here with the smallest synthetic DetectedStatement —
// no bank file, no detection, no preset content. Behaviour only: the function
// returns the emitted rows plus the rejected count and its samples.

const MAPPING: ColumnMapping = {
  date: "Datum",
  description: "Beschreibung",
  amount: "Betrag",
};

function detected(
  records: Array<Record<string, string>>,
  overrides: Partial<DetectedStatement> = {}
): DetectedStatement {
  return {
    bank: "Generic",
    columns: ["Datum", "Beschreibung", "Betrag", "Info"],
    records,
    mapping: MAPPING,
    delimiter: ";",
    decimal: ",",
    dateFmt: "DD.MM.YYYY",
    ...overrides,
  };
}

describe("mapStatementRows — pending rail", () => {
  it("flags a row as pending when its pendingColumn cell is in pendingValues", () => {
    const stmt = detected(
      [
        {
          Datum: "02.11.2026",
          Beschreibung: "REWE SAGT DANKE",
          Betrag: "-12,50",
          Info: "Umsatz vorgemerkt",
        },
      ],
      { pendingColumn: "Info", pendingValues: ["Umsatz vorgemerkt"] }
    );

    const { rows, rejected } = mapStatementRows(stmt, MAPPING);

    expect(rejected.count).toBe(0);
    expect(rows).toHaveLength(1);
    expect(rows[0].pending).toBe(true);
  });

  it("leaves a settled row unflagged when its cell is not in pendingValues", () => {
    const stmt = detected(
      [
        {
          Datum: "02.11.2026",
          Beschreibung: "REWE SAGT DANKE",
          Betrag: "-12,50",
          Info: "Umsatz gebucht",
        },
      ],
      { pendingColumn: "Info", pendingValues: ["Umsatz vorgemerkt"] }
    );

    const { rows } = mapStatementRows(stmt, MAPPING);

    expect(rows[0].pending).toBe(false);
  });

  it("defaults pending to false when the preset defines no pendingColumn", () => {
    const stmt = detected([
      {
        Datum: "02.11.2026",
        Beschreibung: "REWE SAGT DANKE",
        Betrag: "-12,50",
        Info: "Umsatz vorgemerkt",
      },
    ]);

    const { rows } = mapStatementRows(stmt, MAPPING);

    expect(rows[0].pending).toBe(false);
  });
});

describe("mapStatementRows — empty-date skip", () => {
  it("skips a record whose mapped date cell is empty (blank line / balance footer)", () => {
    const stmt = detected([
      {
        Datum: "02.11.2026",
        Beschreibung: "REWE SAGT DANKE",
        Betrag: "-12,50",
        Info: "",
      },
      {
        Datum: "",
        Beschreibung: "Saldo zum 30.11.2026",
        Betrag: "1.234,56",
        Info: "",
      },
    ]);

    const { rows, rejected } = mapStatementRows(stmt, MAPPING);

    // The dateless footer is dropped silently — not a real transaction and not
    // an error, so it never appears in the rows and never counts as rejected.
    expect(rows).toHaveLength(1);
    expect(rows[0].description).toBe("REWE SAGT DANKE");
    expect(rejected.count).toBe(0);
  });

  it("never offers a skipped empty-date record as a sample", () => {
    const stmt = detected([
      {
        Datum: "",
        Beschreibung: "Saldo zum 30.11.2026",
        Betrag: "1.234,56",
        Info: "",
      },
      {
        Datum: "not-a-date",
        Beschreibung: "Kaputt",
        Betrag: "-9,99",
        Info: "",
      },
    ]);

    const { rejected } = mapStatementRows(stmt, MAPPING);

    // Only the junk-date row is evidence of a bad mapping. A footer is not a
    // failure, so it stays out of the count *and* out of the samples.
    expect(rejected.count).toBe(1);
    expect(rejected.samples).toEqual([{ date: "not-a-date", amount: "-9,99" }]);
  });
});

describe("mapStatementRows — rejected rail", () => {
  it("reports no rejections as a zero count and an empty sample list", () => {
    const stmt = detected([
      {
        Datum: "02.11.2026",
        Beschreibung: "REWE SAGT DANKE",
        Betrag: "-12,50",
        Info: "",
      },
    ]);

    const { rejected } = mapStatementRows(stmt, MAPPING);

    expect(rejected).toEqual({ count: 0, samples: [] });
  });

  it("counts a row with a non-empty but unparseable date as rejected, never emitting it", () => {
    const stmt = detected([
      {
        Datum: "02.11.2026",
        Beschreibung: "REWE SAGT DANKE",
        Betrag: "-12,50",
        Info: "",
      },
      {
        Datum: "not-a-date",
        Beschreibung: "Kaputt",
        Betrag: "-9,99",
        Info: "",
      },
    ]);

    const { rows, rejected } = mapStatementRows(stmt, MAPPING);

    // The good row is emitted; the junk-date row is surfaced as a count and
    // kept out of the rows — never silently dropped.
    expect(rows).toHaveLength(1);
    expect(rejected.count).toBe(1);
    expect(rows.some((r) => r.description === "Kaputt")).toBe(false);
  });

  it("counts a row with a valid date but unparseable amount as rejected", () => {
    const stmt = detected([
      {
        Datum: "03.11.2026",
        Beschreibung: "Ungueltig",
        Betrag: "keine Zahl",
        Info: "",
      },
    ]);

    const { rows, rejected } = mapStatementRows(stmt, MAPPING);

    expect(rows).toHaveLength(0);
    expect(rejected.count).toBe(1);
  });

  it("retains the rejected row's date and amount cells raw, exactly as they appeared", () => {
    const stmt = detected([
      {
        Datum: "  2024-01-05 ",
        Beschreibung: "ISO-Datum gegen DD.MM.YYYY",
        Betrag: "1.234.56",
        Info: "",
      },
    ]);

    const { rejected } = mapStatementRows(stmt, MAPPING);

    // The samples are evidence, not data: the whitespace and the original
    // punctuation survive untouched, because reading them is how the user sees
    // that the date column — not the file — is what's wrong.
    expect(rejected.samples).toEqual([
      { date: "  2024-01-05 ", amount: "1.234.56" },
    ]);
  });

  it("caps the samples at five while the count keeps climbing past it", () => {
    const stmt = detected(
      Array.from({ length: 7 }, (_, i) => ({
        Datum: `junk-${i}`,
        Beschreibung: `Kaputt ${i}`,
        Betrag: `nope-${i}`,
        Info: "",
      }))
    );

    const { rows, rejected } = mapStatementRows(stmt, MAPPING);

    // A fully-wrong mapping rejects every row in the file; the count tells the
    // scale of it, the first few samples tell the story, and the rest of the
    // 10,000 stay out of the payload.
    expect(rows).toHaveLength(0);
    expect(rejected.count).toBe(7);
    expect(rejected.samples).toEqual([
      { date: "junk-0", amount: "nope-0" },
      { date: "junk-1", amount: "nope-1" },
      { date: "junk-2", amount: "nope-2" },
      { date: "junk-3", amount: "nope-3" },
      { date: "junk-4", amount: "nope-4" },
    ]);
  });
});

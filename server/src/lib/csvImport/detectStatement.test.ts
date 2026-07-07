import { describe, expect, it } from "vitest";
import { mapStatementRows } from "./detectStatement.js";
import type { DetectedStatement } from "./detectStatement.js";
import type { ColumnMapping } from "../../storage/types.js";

// mapStatementRows is the seam where all three cross-cutting rails live:
//   - per-row `pending`, computed from the preset's pendingColumn/pendingValues
//   - the empty-date skip (blank lines and balance-footer rows)
//   - the rejected count (a row with a non-empty date that fails parsing is
//     surfaced as a count, never silently dropped)
// Each rail is isolated here with the smallest synthetic DetectedStatement —
// no bank file, no detection, no preset content. Behaviour only: the function
// returns the emitted rows plus a rejected count.

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

    expect(rejected).toBe(0);
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
    expect(rejected).toBe(0);
  });
});

describe("mapStatementRows — rejected rail", () => {
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
    expect(rejected).toBe(1);
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
    expect(rejected).toBe(1);
  });
});

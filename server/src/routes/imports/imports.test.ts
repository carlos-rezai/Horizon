import { fileURLToPath } from "url";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { createSqliteAppHandle } from "../../testing/sqliteApp.js";

let app: Express;
let reset: () => Promise<void>;
let cleanup: () => Promise<void>;

beforeAll(async () => {
  const handle = await createSqliteAppHandle();
  app = handle.app;
  reset = handle.reset;
  cleanup = handle.cleanup;
});

afterAll(async () => {
  await cleanup();
});

afterEach(async () => {
  await reset();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function createAccount(
  kind = "Girokonto",
  name = "Main",
  anchorBalance = 500000
) {
  const res = await request(app).post("/accounts").send({
    kind,
    name,
    anchorBalance,
    anchorDate: "2026-01-01",
  });
  return res.body as { id: string };
}

// A real DKB export, already parsed into JSON rows (Phase 1 does no parsing).
// One positive credit (Gehalt) and two debits — signs must round-trip exactly.
const sampleRows = [
  { date: "2026-03-05", amount: -1299, description: "REWE", category: "Food" },
  {
    date: "2026-03-12",
    amount: 250000,
    description: "Gehalt",
    category: "Income",
  },
  {
    date: "2026-03-20",
    amount: -4500,
    description: "Deutsche Bahn",
    category: "Miscellaneous",
  },
];

const sampleMapping = {
  date: "Buchungstag",
  description: "Verwendungszweck",
  amount: "Betrag",
};

async function postImport(
  accountId: string,
  overrides: Record<string, unknown> = {}
) {
  return request(app)
    .post("/imports")
    .send({
      accountId,
      bank: "dkb",
      filename: "dkb-2026-03.csv",
      sizeBytes: 4096,
      mapping: sampleMapping,
      rows: sampleRows,
      ...overrides,
    });
}

// ---------------------------------------------------------------------------
// POST /imports
// ---------------------------------------------------------------------------

describe("POST /imports", () => {
  it("commits the chosen rows and returns the import history record (201)", async () => {
    const account = await createAccount();

    const res = await postImport(account.id);

    expect(res.status).toBe(201);
    expect(typeof res.body.id).toBe("string");
    expect(res.body.accountId).toBe(account.id);
    expect(res.body.bank).toBe("dkb");
    expect(res.body.filename).toBe("dkb-2026-03.csv");
    expect(res.body.sizeBytes).toBe(4096);
    expect(res.body.rowCount).toBe(3);
    expect(res.body.startDate).toBe("2026-03-05");
    expect(res.body.endDate).toBe("2026-03-20");
    expect(typeof res.body.importedAt).toBe("string");
  });

  it("persists one import_id-tagged transaction per row with signs preserved", async () => {
    const account = await createAccount();

    const imported = await postImport(account.id);

    const txsRes = await request(app).get(
      `/accounts/${account.id}/transactions`
    );
    expect(txsRes.body).toHaveLength(3);

    const credit = txsRes.body.find(
      (t: { description: string }) => t.description === "Gehalt"
    );
    expect(credit.amount).toBe(250000); // positive credit stays positive
    for (const tx of txsRes.body) {
      expect(tx.importId).toBe(imported.body.id);
    }
  });

  it("returns 404 for an unknown account and persists nothing (all-or-nothing)", async () => {
    const res = await postImport("00000000-0000-0000-0000-000000000000");

    expect(res.status).toBe(404);

    const history = await request(app).get("/imports");
    expect(history.body).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// GET /imports
// ---------------------------------------------------------------------------

describe("GET /imports", () => {
  it("returns the real import history", async () => {
    const account = await createAccount();
    await postImport(account.id);

    const res = await request(app).get("/imports");

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].bank).toBe("dkb");
    expect(res.body[0].filename).toBe("dkb-2026-03.csv");
    expect(res.body[0].rowCount).toBe(3);
    expect(res.body[0].startDate).toBe("2026-03-05");
    expect(res.body[0].endDate).toBe("2026-03-20");
    expect(res.body[0].sizeBytes).toBe(4096);
  });

  it("filters history by ?accountId=", async () => {
    const a = await createAccount("Girokonto", "A", 100000);
    const b = await createAccount("Tagesgeld", "B", 100000);
    await postImport(a.id);
    await postImport(b.id, { filename: "b.csv" });

    const res = await request(app).get(`/imports?accountId=${a.id}`);

    expect(res.body).toHaveLength(1);
    expect(res.body[0].accountId).toBe(a.id);
  });

  it("returns an empty array when no imports exist", async () => {
    const res = await request(app).get("/imports");
    expect(res.body).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// GET /imports/:id/transactions
// ---------------------------------------------------------------------------

describe("GET /imports/:id/transactions", () => {
  it("returns the persisted rows of a past import", async () => {
    const account = await createAccount();
    const imported = await postImport(account.id);

    const res = await request(app).get(
      `/imports/${imported.body.id}/transactions`
    );

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(3);
    const descriptions = res.body
      .map((t: { description: string }) => t.description)
      .sort();
    expect(descriptions).toEqual(["Deutsche Bahn", "Gehalt", "REWE"]);
  });
});

// ---------------------------------------------------------------------------
// DELETE /imports/:id
// ---------------------------------------------------------------------------

describe("DELETE /imports/:id", () => {
  it("removes the import and all of its transactions (204)", async () => {
    const account = await createAccount();
    const imported = await postImport(account.id);

    const del = await request(app).delete(`/imports/${imported.body.id}`);
    expect(del.status).toBe(204);

    const history = await request(app).get("/imports");
    expect(history.body).toEqual([]);

    const txsRes = await request(app).get(
      `/accounts/${account.id}/transactions`
    );
    expect(txsRes.body).toEqual([]);
  });

  it("leaves hand-entered Variable Spending intact", async () => {
    const account = await createAccount();

    // A hand-entered transaction — import_id NULL.
    await request(app).post(`/accounts/${account.id}/transactions`).send({
      date: "2026-03-02",
      amount: -800,
      description: "Cat food",
      category: "Food",
    });

    const imported = await postImport(account.id);
    expect(imported.status).toBe(201); // the import must actually commit
    await request(app).delete(`/imports/${imported.body.id}`);

    const txsRes = await request(app).get(
      `/accounts/${account.id}/transactions`
    );
    expect(txsRes.body).toHaveLength(1);
    expect(txsRes.body[0].description).toBe("Cat food");
  });

  it("returns 404 for an unknown import id", async () => {
    const res = await request(app).delete(
      "/imports/00000000-0000-0000-0000-000000000000"
    );
    expect(res.status).toBe(404);
    // A real not-found handler answers with a JSON error body (mirrors the
    // transfers route), distinguishing it from Express's bare unmatched-route
    // 404 that ships no body.
    expect(typeof res.body.error).toBe("string");
  });
});

// ---------------------------------------------------------------------------
// POST /imports/preview — multipart parse + detect, no DB writes (Phase 3)
//
// Preview uploads the raw CSV bytes to the local server, which sniffs the
// encoding, detects the bank from the header, parses + categorizes the rows,
// and flags duplicates/recurring against the target account — writing nothing.
// Real bank fixtures (the same ones the pure engine is tested against) drive
// these so the assertions are about end-to-end behaviour, not internals.
//
// Upload caps the route is contracted to enforce:
//   - file size  ~5MB   → 413  (multer, before buffering)
//   - >1 file            → 413  (multer)
//   - >MAX_ROWS rows     → 422  (parse-time reject, never truncate)
//   - >MAX_COLUMNS cols  → 422  (parse-time reject, never truncate)
// with MAX_ROWS = 10000 and MAX_COLUMNS = 50.
// ---------------------------------------------------------------------------

const MAX_ROWS = 10000;
const MAX_COLUMNS = 50;

function fixturePath(name: string): string {
  return fileURLToPath(
    new URL(`../../lib/csvImport/fixtures/${name}`, import.meta.url)
  );
}

/** Upload a real bank fixture file (raw bytes, encoding preserved). */
function previewFixture(name: string, accountId: string) {
  return request(app)
    .post("/imports/preview")
    .field("accountId", accountId)
    .attach("file", fixturePath(name), {
      filename: name,
      contentType: "text/csv",
    });
}

interface PreviewRow {
  id: string;
  date: string;
  description: string;
  amount: number;
  category: string;
  duplicate: boolean;
  recurring: boolean;
}

function rowByDescription(
  rows: PreviewRow[],
  description: string
): PreviewRow | undefined {
  return rows.find((r) => r.description === description);
}

async function createRecurring(
  accountId: string,
  overrides: Record<string, unknown> = {}
) {
  return request(app)
    .post("/recurring-transactions")
    .send({
      accountId,
      amount: -15000,
      description: "Sparplan ETF",
      category: "Investment",
      frequency: "monthly",
      dayOfMonth: 4,
      ...overrides,
    });
}

describe("POST /imports/preview", () => {
  it("parses a Sparkasse statement and returns bank, mapping, columns, rows, summary", async () => {
    const account = await createAccount();

    const res = await previewFixture("sparkasse-giro.csv", account.id);

    expect(res.status).toBe(200);
    expect(res.body.bank).toBe("Sparkasse");
    expect(res.body.mapping).toEqual({
      date: "Buchungstag",
      description: "Beguenstigter/Zahlungspflichtiger",
      amount: "Betrag",
    });
    expect(res.body.columns).toEqual([
      "Auftragskonto",
      "Buchungstag",
      "Valutadatum",
      "Buchungstext",
      "Verwendungszweck",
      "Glaeubiger ID",
      "Mandatsreferenz",
      "Kundenreferenz (End-to-End)",
      "Sammlerreferenz",
      "Lastschrift Ursprungsbetrag",
      "Auslagenersatz Ruecklastschrift",
      "Beguenstigter/Zahlungspflichtiger",
      "Kontonummer/IBAN",
      "BIC (SWIFT-Code)",
      "Betrag",
      "Waehrung",
      "Info",
      "Kategorie",
    ]);
    // Four transactions; the dateless Endsaldo footer is dropped.
    expect(res.body.rows).toHaveLength(4);
    expect(res.body.summary).toMatchObject({
      total: 4,
      duplicates: 0,
      recurring: 0,
    });
  });

  it("converts amounts to signed cents, dates to ISO, and leaves unknown payees in Miscellaneous", async () => {
    const account = await createAccount();

    const res = await previewFixture("sparkasse-giro.csv", account.id);

    const supermarkt = rowByDescription(
      res.body.rows,
      "MUSTER SUPERMARKT GMBH"
    );
    expect(supermarkt).toMatchObject({
      date: "2026-06-24",
      amount: -2041,
      category: "Miscellaneous",
      categorySource: "unmatched",
      duplicate: false,
      recurring: false,
    });
    // Preview is stateless: each returned row carries a server-assigned id.
    expect(typeof supermarkt?.id).toBe("string");

    const gehalt = rowByDescription(res.body.rows, "ARBEITGEBER MUSTER AG");
    expect(gehalt).toMatchObject({ amount: 250000 });
  });

  it("preserves the sign of a positive credit (a salary stays positive)", async () => {
    const account = await createAccount();

    const res = await previewFixture("sparkasse-giro.csv", account.id);

    expect(res.body.bank).toBe("Sparkasse");
    const gehalt = rowByDescription(res.body.rows, "ARBEITGEBER MUSTER AG");
    expect(gehalt).toMatchObject({ amount: 250000 });
  });

  it("detects the bank and decodes Windows-1252 umlauts in the header", async () => {
    const account = await createAccount();

    const res = await previewFixture("postbank-giro.csv", account.id);

    expect(res.body.bank).toBe("PostbankGiro");
    // Decoded from Windows-1252 — not the mangled "Beg�nstigter".
    expect(res.body.columns).toContain("Begünstigter / Auftraggeber");
  });

  it("writes nothing — history and account transactions stay empty", async () => {
    const account = await createAccount();

    const preview = await previewFixture("sparkasse-giro.csv", account.id);
    expect(preview.status).toBe(200);

    const history = await request(app).get("/imports");
    expect(history.body).toEqual([]);

    const txs = await request(app).get(`/accounts/${account.id}/transactions`);
    expect(txs.body).toEqual([]);
  });

  it("flags a row that duplicates an existing account transaction (pre-unchecked but present)", async () => {
    const account = await createAccount();

    // A hand-entered transaction identical to the Sparkasse supermarket row.
    await request(app).post(`/accounts/${account.id}/transactions`).send({
      date: "2026-06-24",
      amount: -2041,
      description: "MUSTER SUPERMARKT GMBH",
      category: "Food",
    });

    const res = await previewFixture("sparkasse-giro.csv", account.id);

    const supermarkt = rowByDescription(
      res.body.rows,
      "MUSTER SUPERMARKT GMBH"
    );
    const gehalt = rowByDescription(res.body.rows, "ARBEITGEBER MUSTER AG");
    expect(supermarkt?.duplicate).toBe(true);
    expect(gehalt?.duplicate).toBe(false);
    // The duplicate is still returned — the user can re-check it.
    expect(res.body.rows).toHaveLength(4);
    expect(res.body.summary.duplicates).toBe(1);
  });

  it("flags a row matching an existing recurring transaction (pre-unchecked but present)", async () => {
    const account = await createAccount();
    await createRecurring(account.id, {
      description: "MUSTER DIENST GMBH",
      amount: -990,
      category: "Miscellaneous",
    });

    const res = await previewFixture("sparkasse-giro.csv", account.id);

    const dienst = rowByDescription(res.body.rows, "MUSTER DIENST GMBH");
    expect(dienst?.recurring).toBe(true);
    expect(res.body.summary.recurring).toBe(1);
    expect(res.body.rows).toHaveLength(4);
  });

  it("falls back to a sensible adjustable mapping when the bank is unmatched", async () => {
    const account = await createAccount();

    const res = await previewFixture("windows1252-umlauts.csv", account.id);

    expect(res.status).toBe(200);
    // Header located even though no preset matched.
    expect(res.body.columns).toContain("Buchungsdatum");
    expect(res.body.columns).toContain("Betrag");
    // A mapping the user can adjust in the wizard.
    expect(typeof res.body.mapping.date).toBe("string");
    expect(typeof res.body.mapping.description).toBe("string");
    expect(typeof res.body.mapping.amount).toBe("string");
  });

  it("rejects an oversized file (~5MB+) with 413 before parsing", async () => {
    const account = await createAccount();
    const big = Buffer.alloc(6 * 1024 * 1024, "a");

    const res = await request(app)
      .post("/imports/preview")
      .field("accountId", account.id)
      .attach("file", big, { filename: "big.csv", contentType: "text/csv" });

    expect(res.status).toBe(413);
  });

  it("rejects a multi-file upload with 413", async () => {
    const account = await createAccount();
    const csv = Buffer.from("a;b\n1;2\n", "utf-8");

    const res = await request(app)
      .post("/imports/preview")
      .field("accountId", account.id)
      .attach("file", csv, { filename: "a.csv", contentType: "text/csv" })
      .attach("file", csv, { filename: "b.csv", contentType: "text/csv" });

    expect(res.status).toBe(413);
  });

  it("rejects a too-many-rows file (never silently truncates)", async () => {
    const account = await createAccount();
    const bom = "﻿";
    const header =
      "Buchungsdatum;Auftraggeber / Begünstigter;Verwendungszweck;Betrag (€)\n";
    const row = "03.11.2026;EDEKA;Lebensmittel EDEKA;-34,20\n";
    const csv = Buffer.from(bom + header + row.repeat(MAX_ROWS + 1), "utf-8");

    const res = await request(app)
      .post("/imports/preview")
      .field("accountId", account.id)
      .attach("file", csv, { filename: "many.csv", contentType: "text/csv" });

    expect(res.status).toBe(422);
  });

  it("rejects a too-many-columns file (never silently truncates)", async () => {
    const account = await createAccount();
    const cols = Array.from({ length: MAX_COLUMNS + 10 }, (_, i) => `Col${i}`);
    const data = Array.from({ length: MAX_COLUMNS + 10 }, () => "x");
    const csv = Buffer.from(`${cols.join(";")}\n${data.join(";")}\n`, "utf-8");

    const res = await request(app)
      .post("/imports/preview")
      .field("accountId", account.id)
      .attach("file", csv, { filename: "wide.csv", contentType: "text/csv" });

    expect(res.status).toBe(422);
  });

  it("remembers the committed format and re-applies it on the next preview", async () => {
    const account = await createAccount();

    // Commit a Sparkasse import carrying a distinctive remembered format. The
    // bank label must match what detection returns ("Sparkasse") so the preset
    // is found on the next preview.
    const committed = await postImport(account.id, {
      bank: "Sparkasse",
      mapping: {
        date: "Buchungstag",
        description: "Verwendungszweck",
        amount: "Betrag",
      },
      decimal: ".",
      dateFmt: "YYYY-MM-DD",
    });
    expect(committed.status).toBe(201);

    const res = await previewFixture("sparkasse-giro.csv", account.id);

    expect(res.status).toBe(200);
    expect(res.body.bank).toBe("Sparkasse");
    // The preview echoes the remembered format, not the detected default —
    // the full preset round-trips, not just the column mapping.
    expect(res.body.decimal).toBe(".");
    expect(res.body.dateFmt).toBe("YYYY-MM-DD");
    expect(res.body.mapping).toEqual({
      date: "Buchungstag",
      description: "Verwendungszweck",
      amount: "Betrag",
    });
  });

  it("returns a clear error for a non-CSV / unparseable file", async () => {
    const account = await createAccount();
    // PNG magic bytes — not a CSV at all.
    const garbage = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
    ]);

    const res = await request(app)
      .post("/imports/preview")
      .field("accountId", account.id)
      .attach("file", garbage, {
        filename: "image.png",
        contentType: "application/octet-stream",
      });

    expect(res.status).toBe(422);
    expect(typeof res.body.error).toBe("string");
  });
});

// ---------------------------------------------------------------------------
// Issue #234 — the preview supplies the target account's Anchor Date to
// Recurring Detection: a matching row on or before it is not flagged, one
// after it still is. Sparkasse fixture: Gehalt on 2026-06-05, MUSTER DIENST
// GMBH on 2026-06-10.
// ---------------------------------------------------------------------------

describe("POST /imports/preview — Anchor Date", () => {
  it("flags recurring rows only after the target account's anchor date", async () => {
    const accountRes = await request(app).post("/accounts").send({
      kind: "Girokonto",
      name: "Anchored",
      anchorBalance: 500000,
      anchorDate: "2026-06-07",
    });
    const accountId = (accountRes.body as { id: string }).id;
    await createRecurring(accountId, {
      description: "ARBEITGEBER MUSTER AG",
      amount: 250000,
      category: "Miscellaneous",
    });
    await createRecurring(accountId, {
      description: "MUSTER DIENST GMBH",
      amount: -990,
      category: "Miscellaneous",
    });

    const res = await previewFixture("sparkasse-giro.csv", accountId);

    expect(res.status).toBe(200);
    const rows = res.body.rows as PreviewRow[];
    expect(rowByDescription(rows, "ARBEITGEBER MUSTER AG")?.recurring).toBe(
      false
    );
    expect(rowByDescription(rows, "MUSTER DIENST GMBH")?.recurring).toBe(true);
    expect(res.body.summary.recurring).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Issue #258 — Import Category Learning, Phase 1: learn and apply.
//
// Committing a row is the approval: POST /imports derives Category Rules from
// the teaching rows (source learned / suggested / chosen) and stores them; the
// next POST /imports/preview applies them as `learned`. What was learned is
// observed only through a later preview of the Sparkasse fixture, never by
// reaching into storage. Commits go in under a bank label other than the
// detected "Sparkasse" so no remembered preset changes how the fixture parses —
// Category Rules are global across banks, so the label does not matter.
//
// Each "teaches nothing" test carries a positive control — a row that does
// teach — or asserts the `unmatched` source, so it proves the commit learned
// selectively rather than passing on a server that learns nothing at all.
// ---------------------------------------------------------------------------

type CategorySourceName =
  | "learned"
  | "suggested"
  | "proposed"
  | "unmatched"
  | "chosen";

interface LearningPreviewRow extends PreviewRow {
  counterparty: string;
  categorySource: CategorySourceName;
}

/** One commit row for a Sparkasse payee, its counterparty as parsed. */
function teachRow(
  description: string,
  category: string,
  categorySource: CategorySourceName,
  extra: Record<string, unknown> = {}
) {
  return {
    date: "2026-06-24",
    amount: -2041,
    description,
    counterparty: description,
    category,
    categorySource,
    ...extra,
  };
}

async function previewRows(accountId: string): Promise<LearningPreviewRow[]> {
  const res = await previewFixture("sparkasse-giro.csv", accountId);
  expect(res.status).toBe(200);
  return res.body.rows as LearningPreviewRow[];
}

function payee(rows: LearningPreviewRow[], description: string) {
  const row = rows.find((r) => r.description === description);
  expect(row, description).toBeDefined();
  return row as LearningPreviewRow;
}

const SUPERMARKT = "MUSTER SUPERMARKT GMBH";
const ARBEITGEBER = "ARBEITGEBER MUSTER AG";
const VERSAND = "MUSTER VERSAND GMBH";
const DIENST = "MUSTER DIENST GMBH";

describe("POST /imports/preview — Category Rules (#258)", () => {
  it("gives every row its counterparty, and an unknown payee Miscellaneous / unmatched", async () => {
    const account = await createAccount();

    const rows = await previewRows(account.id);

    expect(rows).toHaveLength(4);
    for (const row of rows) {
      expect(row.counterparty).toBe(row.description);
      expect(row).toMatchObject({
        category: "Miscellaneous",
        categorySource: "unmatched",
      });
    }
  });

  it("demo: a second import of the same statement arrives mostly categorized", async () => {
    const account = await createAccount();
    const first = await previewRows(account.id);

    // The user corrects three of the four rows in review and commits them all.
    const corrections: Record<string, string> = {
      [SUPERMARKT]: "Food",
      [ARBEITGEBER]: "Income",
      [DIENST]: "Subscriptions",
    };
    const committed = await postImport(account.id, {
      rows: first.map((r) => ({
        date: r.date,
        amount: r.amount,
        description: r.description,
        counterparty: r.counterparty,
        category: corrections[r.description] ?? r.category,
        categorySource:
          r.description in corrections ? "chosen" : r.categorySource,
      })),
    });
    expect(committed.status).toBe(201);

    const second = await previewRows(account.id);

    for (const [description, category] of Object.entries(corrections)) {
      expect(payee(second, description)).toMatchObject({
        category,
        categorySource: "learned",
      });
    }
    // The row left on the fallback taught nothing.
    expect(payee(second, VERSAND)).toMatchObject({
      category: "Miscellaneous",
      categorySource: "unmatched",
    });
  });

  it("applies a learned Category Rule into a Hidden Category", async () => {
    const account = await createAccount();
    await postImport(account.id, {
      rows: [teachRow(SUPERMARKT, "Food", "chosen")],
    });

    const categories = await request(app).get("/categories");
    const food = (categories.body as Array<{ id: string; name: string }>).find(
      (c) => c.name === "Food"
    );
    const hidden = await request(app)
      .patch(`/categories/${food?.id}`)
      .send({ hidden: true });
    expect(hidden.status).toBe(200);

    const rows = await previewRows(account.id);

    expect(payee(rows, SUPERMARKT)).toMatchObject({
      category: "Food",
      categorySource: "learned",
    });
  });

  it("overwrites a Category Rule when a later commit teaches the payee differently", async () => {
    const account = await createAccount();
    await postImport(account.id, {
      rows: [teachRow(SUPERMARKT, "Food", "chosen")],
    });
    await postImport(account.id, {
      filename: "dkb-2026-04.csv",
      rows: [teachRow(SUPERMARKT, "Housing", "chosen")],
    });

    const rows = await previewRows(account.id);

    expect(payee(rows, SUPERMARKT)).toMatchObject({
      category: "Housing",
      categorySource: "learned",
    });
  });

  it("keeps a learned Category Rule after the import that taught it is deleted", async () => {
    const account = await createAccount();
    const committed = await postImport(account.id, {
      rows: [teachRow(SUPERMARKT, "Food", "chosen")],
    });
    const deleted = await request(app).delete(`/imports/${committed.body.id}`);
    expect(deleted.status).toBe(204);

    const rows = await previewRows(account.id);

    expect(payee(rows, SUPERMARKT)).toMatchObject({
      category: "Food",
      categorySource: "learned",
    });
  });
});

describe("POST /imports — learning from the commit (#258)", () => {
  it("learns from learned, suggested and chosen rows, and not from unmatched or proposed ones", async () => {
    const account = await createAccount();
    const res = await postImport(account.id, {
      rows: [
        teachRow(SUPERMARKT, "Food", "learned"),
        teachRow(DIENST, "Subscriptions", "suggested"),
        teachRow(ARBEITGEBER, "Income", "chosen"),
        teachRow(VERSAND, "Miscellaneous", "proposed"),
      ],
    });
    expect(res.status).toBe(201);

    const rows = await previewRows(account.id);

    expect(payee(rows, SUPERMARKT)).toMatchObject({
      category: "Food",
      categorySource: "learned",
    });
    expect(payee(rows, DIENST)).toMatchObject({
      category: "Subscriptions",
      categorySource: "learned",
    });
    expect(payee(rows, ARBEITGEBER)).toMatchObject({
      category: "Income",
      categorySource: "learned",
    });
    expect(payee(rows, VERSAND)).toMatchObject({
      category: "Miscellaneous",
      categorySource: "unmatched",
    });
  });

  it("learns a row deliberately set to Miscellaneous, but not a row left on the fallback", async () => {
    const account = await createAccount();
    await postImport(account.id, {
      rows: [
        teachRow(SUPERMARKT, "Miscellaneous", "chosen"),
        teachRow(DIENST, "Miscellaneous", "unmatched"),
      ],
    });

    const rows = await previewRows(account.id);

    expect(payee(rows, SUPERMARKT)).toMatchObject({
      category: "Miscellaneous",
      categorySource: "learned",
    });
    expect(payee(rows, DIENST)).toMatchObject({
      category: "Miscellaneous",
      categorySource: "unmatched",
    });
  });

  it("never learns into a category that does not exist", async () => {
    const account = await createAccount();
    await postImport(account.id, {
      rows: [
        teachRow(SUPERMARKT, "Ghost", "chosen"),
        teachRow(DIENST, "Subscriptions", "chosen"),
      ],
    });
    // Creating the category afterwards must not bring a rule to life: none was
    // ever stored for it.
    const created = await request(app)
      .post("/categories")
      .send({ name: "Ghost" });
    expect(created.status).toBe(201);

    const rows = await previewRows(account.id);

    expect(payee(rows, SUPERMARKT)).toMatchObject({
      category: "Miscellaneous",
      categorySource: "unmatched",
    });
    expect(payee(rows, DIENST)).toMatchObject({
      category: "Subscriptions",
      categorySource: "learned",
    });
  });

  it("re-derives every key itself and ignores a key sent by the client", async () => {
    const account = await createAccount();
    await postImport(account.id, {
      rows: [
        teachRow(SUPERMARKT, "Food", "chosen", {
          counterpartyKey: "muster dienst gmbh",
        }),
      ],
    });

    const rows = await previewRows(account.id);

    expect(payee(rows, SUPERMARKT)).toMatchObject({
      category: "Food",
      categorySource: "learned",
    });
    expect(payee(rows, DIENST)).toMatchObject({
      category: "Miscellaneous",
      categorySource: "unmatched",
    });
  });

  it("keys on the counterparty, not on a description edited in review", async () => {
    const account = await createAccount();
    await postImport(account.id, {
      rows: [
        teachRow(SUPERMARKT, "Food", "chosen", {
          description: "Weekly shop",
        }),
      ],
    });

    const rows = await previewRows(account.id);

    expect(payee(rows, SUPERMARKT)).toMatchObject({
      category: "Food",
      categorySource: "learned",
    });
  });

  it("commits an older payload without counterparty or source, and it teaches nothing", async () => {
    const account = await createAccount();
    const res = await postImport(account.id, {
      rows: [
        {
          date: "2026-06-24",
          amount: -2041,
          description: SUPERMARKT,
          category: "Food",
        },
      ],
    });
    expect(res.status).toBe(201);

    const rows = await previewRows(account.id);

    expect(payee(rows, SUPERMARKT)).toMatchObject({
      category: "Miscellaneous",
      categorySource: "unmatched",
    });
  });

  it("learns nothing from a commit that fails validation", async () => {
    const account = await createAccount();
    const res = await postImport(account.id, {
      rows: [
        teachRow(SUPERMARKT, "Food", "chosen"),
        teachRow("", "Subscriptions", "chosen", { counterparty: DIENST }),
      ],
    });
    expect(res.status).toBe(400);

    const rows = await previewRows(account.id);

    expect(payee(rows, SUPERMARKT)).toMatchObject({
      category: "Miscellaneous",
      categorySource: "unmatched",
    });
    expect(payee(rows, DIENST)).toMatchObject({
      category: "Miscellaneous",
      categorySource: "unmatched",
    });
  });

  it("learns nothing from a commit to an unknown account", async () => {
    const res = await postImport("00000000-0000-0000-0000-000000000000", {
      rows: [teachRow(SUPERMARKT, "Food", "chosen")],
    });
    expect(res.status).toBe(404);
    const account = await createAccount();

    const rows = await previewRows(account.id);

    expect(payee(rows, SUPERMARKT)).toMatchObject({
      category: "Miscellaneous",
      categorySource: "unmatched",
    });
  });
});

describe("Category Rules are never taught outside an import (#258)", () => {
  it("hand-entered Variable Spending and a Month Overview edit create no Category Rule", async () => {
    const account = await createAccount();
    const created = await request(app)
      .post(`/accounts/${account.id}/transactions`)
      .send({
        date: "2026-06-24",
        amount: -2041,
        description: SUPERMARKT,
        category: "Food",
      });
    expect(created.status).toBe(201);
    const edited = await request(app)
      .patch(`/transactions/${created.body.id}`)
      .send({ category: "Housing" });
    expect(edited.status).toBe(200);

    const rows = await previewRows(account.id);

    expect(payee(rows, SUPERMARKT)).toMatchObject({
      category: "Miscellaneous",
      categorySource: "unmatched",
    });
  });
});

// ---------------------------------------------------------------------------
// Issue #260 — Import Category Learning, Phase 3: Keyword Groups.
//
// With no Category Rule, a row whose counterparty or description hits a
// Keyword Group arrives `suggested` in the user's visible category of that
// name or a synonym. On an untouched install that means the default
// categories: REWE lands in Food, Netflix in Subscriptions. The keyword lists
// are a build detail; these payees are ones any vocabulary carries.
// ---------------------------------------------------------------------------

const KEYWORD_CSV =
  "Datum;Beschreibung;Betrag\n" +
  "24.06.2026;REWE Markt 0815;-12,50\n" +
  "25.06.2026;NETFLIX.COM;-13,99\n" +
  "26.06.2026;MUSTER DIENST GMBH;-9,90\n";

async function previewKeywordCsv(
  accountId: string
): Promise<LearningPreviewRow[]> {
  const res = await request(app)
    .post("/imports/preview")
    .field("accountId", accountId)
    .attach("file", Buffer.from(KEYWORD_CSV, "utf8"), {
      filename: "keywords.csv",
      contentType: "text/csv",
    });
  expect(res.status).toBe(200);
  return res.body.rows as LearningPreviewRow[];
}

describe("POST /imports/preview — Keyword Groups (#260)", () => {
  it("demo: on an untouched install a first import is partly categorized into the default categories", async () => {
    const account = await createAccount();

    const rows = await previewKeywordCsv(account.id);

    expect(payee(rows, "REWE Markt 0815")).toMatchObject({
      category: "Food",
      categorySource: "suggested",
    });
    expect(payee(rows, "NETFLIX.COM")).toMatchObject({
      category: "Subscriptions",
      categorySource: "suggested",
    });
    expect(payee(rows, "MUSTER DIENST GMBH")).toMatchObject({
      category: "Miscellaneous",
      categorySource: "unmatched",
    });
  });

  it("teaches a Category Rule from a committed suggested row, so the next preview has it learned", async () => {
    const account = await createAccount();
    const first = await previewKeywordCsv(account.id);

    const committed = await postImport(account.id, {
      // Committed under the default "dkb" label so no remembered preset
      // changes how the generic CSV parses next time.
      filename: "keywords.csv",
      rows: first.map((r) => ({
        date: r.date,
        amount: r.amount,
        description: r.description,
        counterparty: r.counterparty,
        category: r.category,
        categorySource: r.categorySource,
      })),
    });
    expect(committed.status).toBe(201);

    const second = await previewKeywordCsv(account.id);

    expect(payee(second, "REWE Markt 0815")).toMatchObject({
      category: "Food",
      categorySource: "learned",
    });
    // The unmatched row taught nothing.
    expect(payee(second, "MUSTER DIENST GMBH")).toMatchObject({
      category: "Miscellaneous",
      categorySource: "unmatched",
    });
  });
});

// ---------------------------------------------------------------------------
// Issue #261 — Import Category Learning, Phase 2: rules follow categories.
//
// Category Management changes carry through to Category Rules: a rename moves
// a category's rules to the new name, reassign-on-delete moves them to the
// target, and a plain delete of an unused category deletes them. Observed, as
// in #258, only through a later preview. Each test keeps a rule for an
// untouched category as a positive control.
// ---------------------------------------------------------------------------

async function createCategoryViaApi(name: string): Promise<string> {
  const res = await request(app).post("/categories").send({ name });
  expect(res.status).toBe(201);
  return (res.body as { id: string }).id;
}

async function categoryIdByName(name: string): Promise<string> {
  const res = await request(app).get("/categories");
  const found = (res.body as Array<{ id: string; name: string }>).find(
    (c) => c.name === name
  );
  expect(found, name).toBeDefined();
  return (found as { id: string }).id;
}

describe("Category Rules follow Category Management (#261)", () => {
  it("after a rename, the next preview shows the renamed category as learned", async () => {
    const account = await createAccount();
    const vetId = await createCategoryViaApi("Vet");
    const committed = await postImport(account.id, {
      rows: [
        teachRow(SUPERMARKT, "Vet", "chosen"),
        teachRow(DIENST, "Subscriptions", "chosen"),
      ],
    });
    expect(committed.status).toBe(201);

    const renamed = await request(app)
      .patch(`/categories/${vetId}`)
      .send({ name: "Pets" });
    expect(renamed.status).toBe(200);

    const rows = await previewRows(account.id);

    expect(payee(rows, SUPERMARKT)).toMatchObject({
      category: "Pets",
      categorySource: "learned",
    });
    expect(payee(rows, DIENST)).toMatchObject({
      category: "Subscriptions",
      categorySource: "learned",
    });
  });

  it("after reassign-on-delete, the next preview shows the target category as learned", async () => {
    const account = await createAccount();
    const vetId = await createCategoryViaApi("Vet");
    const committed = await postImport(account.id, {
      rows: [
        teachRow(SUPERMARKT, "Vet", "chosen"),
        teachRow(DIENST, "Subscriptions", "chosen"),
      ],
    });
    expect(committed.status).toBe(201);
    const foodId = await categoryIdByName("Food");

    const deleted = await request(app).delete(
      `/categories/${vetId}?reassignTo=${foodId}`
    );
    expect(deleted.status).toBe(204);

    const rows = await previewRows(account.id);

    expect(payee(rows, SUPERMARKT)).toMatchObject({
      category: "Food",
      categorySource: "learned",
    });
    expect(payee(rows, DIENST)).toMatchObject({
      category: "Subscriptions",
      categorySource: "learned",
    });
  });

  it("a plain delete of an unused category removes its rules, so re-creating the name revives nothing", async () => {
    const account = await createAccount();
    const vetId = await createCategoryViaApi("Vet");
    const committed = await postImport(account.id, {
      rows: [
        teachRow(SUPERMARKT, "Vet", "chosen"),
        teachRow(DIENST, "Subscriptions", "chosen"),
      ],
    });
    expect(committed.status).toBe(201);
    // Deleting the import leaves "Vet" with no transactions, so the category
    // delete below is a plain delete rather than in_use.
    const undone = await request(app).delete(`/imports/${committed.body.id}`);
    expect(undone.status).toBe(204);

    const deleted = await request(app).delete(`/categories/${vetId}`);
    expect(deleted.status).toBe(204);
    await createCategoryViaApi("Vet");

    const rows = await previewRows(account.id);

    expect(payee(rows, SUPERMARKT)).toMatchObject({
      category: "Miscellaneous",
      categorySource: "unmatched",
    });
    expect(payee(rows, DIENST)).toMatchObject({
      category: "Subscriptions",
      categorySource: "learned",
    });
  });
});

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
  openingBalance = 500000
) {
  const res = await request(app).post("/accounts").send({
    kind,
    name,
    openingBalance,
    openingDate: "2026-01-01",
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
  it("parses a DKB statement and returns bank, mapping, columns, rows, summary", async () => {
    const account = await createAccount();

    const res = await previewFixture("dkb.csv", account.id);

    expect(res.status).toBe(200);
    expect(res.body.bank).toBe("DKB");
    expect(res.body.mapping).toEqual({
      date: "Buchungsdatum",
      description: "Verwendungszweck",
      amount: "Betrag (€)",
    });
    expect(res.body.columns).toEqual([
      "Buchungsdatum",
      "Auftraggeber / Begünstigter",
      "Verwendungszweck",
      "Betrag (€)",
    ]);
    expect(res.body.rows).toHaveLength(2);
    expect(res.body.summary).toMatchObject({
      total: 2,
      duplicates: 0,
      recurring: 0,
    });
  });

  it("converts amounts to signed cents, dates to ISO, and auto-categorizes", async () => {
    const account = await createAccount();

    const res = await previewFixture("dkb.csv", account.id);

    const edeka = rowByDescription(res.body.rows, "Lebensmittel EDEKA");
    expect(edeka).toMatchObject({
      date: "2026-11-03",
      amount: -3420,
      category: "Food",
      duplicate: false,
      recurring: false,
    });
    // Preview is stateless: each returned row carries a server-assigned id.
    expect(typeof edeka?.id).toBe("string");

    const etf = rowByDescription(res.body.rows, "Sparplan ETF MSCI World");
    expect(etf).toMatchObject({ amount: -15000, category: "Investment" });
  });

  it("preserves the sign of a positive credit (Gehalt stays positive)", async () => {
    const account = await createAccount();

    const res = await previewFixture("sparkasse.csv", account.id);

    expect(res.body.bank).toBe("Sparkasse");
    const gehalt = rowByDescription(res.body.rows, "Gehalt Oktober");
    expect(gehalt).toMatchObject({ amount: 250000, category: "Income" });
  });

  it("detects each target bank and decodes Windows-1252 umlauts in the header", async () => {
    const account = await createAccount();

    const ing = await previewFixture("ing.csv", account.id);

    expect(ing.body.bank).toBe("ING");
    // Decoded from Windows-1252 — not the mangled "Empf�nger".
    expect(ing.body.columns).toContain("Auftraggeber/Empfänger");
  });

  it("writes nothing — history and account transactions stay empty", async () => {
    const account = await createAccount();

    const preview = await previewFixture("dkb.csv", account.id);
    expect(preview.status).toBe(200);

    const history = await request(app).get("/imports");
    expect(history.body).toEqual([]);

    const txs = await request(app).get(`/accounts/${account.id}/transactions`);
    expect(txs.body).toEqual([]);
  });

  it("flags a row that duplicates an existing account transaction (pre-unchecked but present)", async () => {
    const account = await createAccount();

    // A hand-entered transaction identical to the DKB EDEKA row.
    await request(app).post(`/accounts/${account.id}/transactions`).send({
      date: "2026-11-03",
      amount: -3420,
      description: "Lebensmittel EDEKA",
      category: "Food",
    });

    const res = await previewFixture("dkb.csv", account.id);

    const edeka = rowByDescription(res.body.rows, "Lebensmittel EDEKA");
    const etf = rowByDescription(res.body.rows, "Sparplan ETF MSCI World");
    expect(edeka?.duplicate).toBe(true);
    expect(etf?.duplicate).toBe(false);
    // The duplicate is still returned — the user can re-check it.
    expect(res.body.rows).toHaveLength(2);
    expect(res.body.summary.duplicates).toBe(1);
  });

  it("flags a row matching an existing recurring transaction (pre-unchecked but present)", async () => {
    const account = await createAccount();
    await createRecurring(account.id);

    const res = await previewFixture("dkb.csv", account.id);

    const etf = rowByDescription(res.body.rows, "Sparplan ETF MSCI World");
    expect(etf?.recurring).toBe(true);
    expect(res.body.summary.recurring).toBe(1);
    expect(res.body.rows).toHaveLength(2);
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

    // Commit a DKB import carrying a distinctive remembered format. The bank
    // label must match what detection returns ("DKB") so the preset is found.
    const committed = await postImport(account.id, {
      bank: "DKB",
      mapping: {
        date: "Buchungsdatum",
        description: "Verwendungszweck",
        amount: "Betrag (€)",
      },
      decimal: ".",
      dateFmt: "YYYY-MM-DD",
    });
    expect(committed.status).toBe(201);

    const res = await previewFixture("dkb.csv", account.id);

    expect(res.status).toBe(200);
    expect(res.body.bank).toBe("DKB");
    // The preview echoes the remembered format, not the detected default —
    // the full preset round-trips, not just the column mapping.
    expect(res.body.decimal).toBe(".");
    expect(res.body.dateFmt).toBe("YYYY-MM-DD");
    expect(res.body.mapping).toEqual({
      date: "Buchungsdatum",
      description: "Verwendungszweck",
      amount: "Betrag (€)",
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

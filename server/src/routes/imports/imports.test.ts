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

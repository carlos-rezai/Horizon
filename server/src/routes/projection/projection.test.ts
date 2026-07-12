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

async function createAccount(overrides: Record<string, unknown> = {}) {
  const res = await request(app)
    .post("/accounts")
    .send({
      kind: "Girokonto",
      name: "Main",
      openingBalance: 100000,
      openingDate: "2025-01-01",
      ...overrides,
    });
  return res.body as { id: string };
}

/** Commit an import — creates an import record plus one transaction per row. */
async function importStatement(
  accountId: string,
  rows: {
    date: string;
    amount: number;
    description?: string;
    category?: string;
  }[]
) {
  return request(app)
    .post("/imports")
    .send({
      accountId,
      bank: "Test Bank",
      filename: "statement.csv",
      sizeBytes: 1024,
      mapping: { date: "Date", description: "Desc", amount: "Amount" },
      rows: rows.map((r) => ({
        date: r.date,
        amount: r.amount,
        description: r.description ?? "Imported row",
        category: r.category ?? "Groceries",
      })),
    });
}

async function addRecurring(
  accountId: string,
  overrides: Record<string, unknown> = {}
) {
  return request(app)
    .post("/recurring-transactions")
    .send({
      accountId,
      amount: -50000,
      description: "Rent",
      category: "Housing",
      frequency: "monthly",
      dayOfMonth: 1,
      ...overrides,
    });
}

interface HistoryPoint {
  month: string;
  totalLiquid: number;
  restschuld: number;
  netCashflow: number;
  accounts: Record<string, number>;
}

// ---------------------------------------------------------------------------
// GET /projection/history
// ---------------------------------------------------------------------------

describe("GET /projection/history", () => {
  it("returns [] when there are no imported statements", async () => {
    await createAccount();

    const res = await request(app).get("/projection/history");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("spans the earliest imported transaction month through the current month", async () => {
    const giro = await createAccount();
    await importStatement(giro.id, [{ date: "2026-03-15", amount: -1000 }]);

    const res = await request(app).get("/projection/history");
    const points = res.body as HistoryPoint[];

    expect(res.status).toBe(200);
    // current month is 2026-07 in this project's clock
    expect(points[0].month).toBe("2026-03");
    expect(points[points.length - 1].month).toBe("2026-07");
  });

  it("sets the lower bound to the earliest imported transaction month", async () => {
    const giro = await createAccount();
    await importStatement(giro.id, [
      { date: "2026-05-01", amount: -1000 },
      { date: "2026-02-10", amount: -2000 },
    ]);

    const res = await request(app).get("/projection/history");
    const points = res.body as HistoryPoint[];

    expect(points[0].month).toBe("2026-02");
  });

  it("reports totalLiquid from the account's actual balance", async () => {
    const giro = await createAccount({ openingBalance: 100000 });
    await importStatement(giro.id, [{ date: "2026-03-15", amount: -1000 }]);

    const res = await request(app).get("/projection/history");
    const points = res.body as HistoryPoint[];

    const march = points.find((p) => p.month === "2026-03")!;
    // opening 100000 + imported -1000 = 99000
    expect(march.totalLiquid).toBe(99000);
    expect(march.accounts[giro.id]).toBe(99000);
  });

  it("computes netCashflow from stored transactions, not the recurring figure", async () => {
    const giro = await createAccount();
    await addRecurring(giro.id, { amount: -50000 });
    await importStatement(giro.id, [{ date: "2026-03-15", amount: -1000 }]);

    const res = await request(app).get("/projection/history");
    const points = res.body as HistoryPoint[];

    const march = points.find((p) => p.month === "2026-03")!;
    // real stored transaction only — the -50000 monthly recurring is ignored
    expect(march.netCashflow).toBe(-1000);
  });
});

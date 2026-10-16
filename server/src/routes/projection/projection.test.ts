import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import request from "supertest";
import type { Express } from "express";
import { createSqliteAppHandle } from "../../testing/sqliteApp.js";

/**
 * The clock this file runs against. `/projection/history` spans through "the
 * current month", so against the real clock its upper bound moves with the
 * calendar and the assertion below would only hold during one month of one year.
 */
const NOW = new Date("2026-07-15T12:00:00");
const CURRENT_MONTH = "2026-07";

let app: Express;
let reset: () => Promise<void>;
let cleanup: () => Promise<void>;

beforeAll(async () => {
  // Only `Date` is faked. Supertest runs a real HTTP server against a real
  // socket, so faking its timers as well would hang every request in the file.
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);

  const handle = await createSqliteAppHandle();
  app = handle.app;
  reset = handle.reset;
  cleanup = handle.cleanup;
});

afterAll(async () => {
  await cleanup();
  vi.useRealTimers();
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
      anchorBalance: 100000,
      anchorDate: "2025-01-01",
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
  it("returns [] on a fresh install", async () => {
    const res = await request(app).get("/projection/history");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("returns [] when only the current month is known", async () => {
    // Anchored this month, with an import this month: the History Span holds
    // the current month alone.
    const giro = await createAccount({ anchorDate: "2026-07-05" });
    await importStatement(giro.id, [{ date: "2026-07-10", amount: -1000 }]);

    const res = await request(app).get("/projection/history");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("spans an account anchored months ago through the current month, without imports", async () => {
    const giro = await createAccount({ anchorDate: "2026-02-10" });

    const res = await request(app).get("/projection/history");
    const points = res.body as HistoryPoint[];

    expect(res.status).toBe(200);
    expect(points.map((p) => p.month)).toEqual([
      "2026-02",
      "2026-03",
      "2026-04",
      "2026-05",
      "2026-06",
      CURRENT_MONTH,
    ]);
    expect(points[0].accounts[giro.id]).toBe(100000);
  });

  it("starts at the earliest Known Since across all accounts", async () => {
    await createAccount({ anchorDate: "2026-05-01" });
    await createAccount({
      kind: "Tagesgeld",
      name: "Savings",
      anchorBalance: 500000,
      anchorDate: "2026-03-20",
    });

    const res = await request(app).get("/projection/history");
    const points = res.body as HistoryPoint[];

    expect(points[0].month).toBe("2026-03");
    expect(points[points.length - 1].month).toBe(CURRENT_MONTH);
  });

  it("starts at the earliest imported transaction when it predates every anchor", async () => {
    const giro = await createAccount({ anchorDate: "2026-06-30" });
    await importStatement(giro.id, [
      { date: "2026-05-01", amount: -1000 },
      { date: "2026-02-10", amount: -2000 },
    ]);

    const res = await request(app).get("/projection/history");
    const points = res.body as HistoryPoint[];

    expect(points[0].month).toBe("2026-02");
    expect(points[points.length - 1].month).toBe(CURRENT_MONTH);
  });

  it("starts at an anchor that predates every imported transaction", async () => {
    const giro = await createAccount({ anchorDate: "2025-11-15" });
    await importStatement(giro.id, [{ date: "2026-03-15", amount: -1000 }]);

    const res = await request(app).get("/projection/history");
    const points = res.body as HistoryPoint[];

    expect(points[0].month).toBe("2025-11");
    expect(points[points.length - 1].month).toBe(CURRENT_MONTH);
  });

  it("reports totalLiquid from the account's actual balance", async () => {
    const giro = await createAccount({ anchorBalance: 100000 });
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

// ---------------------------------------------------------------------------
// GET /projection/history — Unknown months (Balance Anchor, issue #235)
// ---------------------------------------------------------------------------

describe("GET /projection/history — Unknown before Known Since", () => {
  it("returns null for an account in the months before its Known Since", async () => {
    const giro = await createAccount({ anchorDate: "2025-01-01" });
    // Anchored in May with no transactions: Known Since is 2026-05.
    const tagesgeld = await createAccount({
      kind: "Tagesgeld",
      name: "Savings",
      anchorBalance: 500000,
      anchorDate: "2026-05-10",
    });
    await importStatement(giro.id, [{ date: "2026-03-15", amount: -1000 }]);

    const res = await request(app).get("/projection/history");
    const points = res.body as {
      month: string;
      accounts: Record<string, number | null>;
    }[];

    const march = points.find((p) => p.month === "2026-03")!;
    const april = points.find((p) => p.month === "2026-04")!;
    const may = points.find((p) => p.month === "2026-05")!;

    expect(march.accounts).toHaveProperty(tagesgeld.id, null);
    expect(april.accounts).toHaveProperty(tagesgeld.id, null);
    expect(may.accounts[tagesgeld.id]).toBe(500000);
  });
});

// ---------------------------------------------------------------------------
// GET /projection/history — Paydown Bridge (Financial History, issue #240)
// ---------------------------------------------------------------------------

describe("GET /projection/history — Paydown Bridge", () => {
  it("returns points from the Mortgage Start month for a mortgage origination with no imports", async () => {
    // Anchored this month: without the origination the span would hold only
    // the current month and the response would be [].
    const mortgage = await createAccount({
      kind: "Mortgage",
      name: "Haus",
      anchorBalance: 30000000,
      anchorDate: "2026-07-01",
    });
    const patched = await request(app)
      .patch(`/accounts/${mortgage.id}/mortgage`)
      .send({
        originalPrincipal: 32000000,
        startDate: "2026-03-01",
        termYears: 10,
      });
    expect(patched.status).toBe(200);

    const res = await request(app).get("/projection/history");
    const points = res.body as {
      month: string;
      restschuld: number | null;
      restschuldBridge: number | null;
    }[];

    expect(res.status).toBe(200);
    expect(points.map((p) => p.month)).toEqual([
      "2026-03",
      "2026-04",
      "2026-05",
      "2026-06",
      CURRENT_MONTH,
    ]);
    expect(points[0].restschuldBridge).toBe(32000000);
    expect(points[0].restschuld).toBeNull();
    expect(points[4].restschuldBridge).toBe(points[4].restschuld);
  });
});

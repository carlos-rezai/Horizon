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
      openingBalance: 0,
      openingDate: "2025-01-01",
      ...overrides,
    });
  return res.body as { id: string };
}

async function addTransaction(
  accountId: string,
  amount: number,
  date: string,
  category: string
) {
  await request(app)
    .post(`/accounts/${accountId}/transactions`)
    .send({ date, amount, description: "Test tx", category });
}

interface YcRow {
  category: string;
  thisYear: number;
  lastYear: number;
}

// ---------------------------------------------------------------------------
// GET /reports/year-comparison?month=YYYY-MM
// ---------------------------------------------------------------------------

describe("GET /reports/year-comparison", () => {
  it("returns 200 with { month, rows } for the viewed month", async () => {
    const giro = await createAccount();
    await addTransaction(giro.id, -1000, "2026-03-01", "Groceries");

    const res = await request(app).get(
      "/reports/year-comparison?month=2026-06"
    );

    expect(res.status).toBe(200);
    expect(res.body.month).toBe("2026-06");
    expect(Array.isArray(res.body.rows)).toBe(true);
  });

  it("aggregates per-category magnitudes pairing this year against last year", async () => {
    const giro = await createAccount();
    // this year (Jan–June 2026)
    await addTransaction(giro.id, -1000, "2026-02-01", "Groceries");
    await addTransaction(giro.id, -2000, "2026-05-01", "Groceries");
    // last year, same Jan–June 2025 window
    await addTransaction(giro.id, -4000, "2025-03-01", "Groceries");

    const res = await request(app).get(
      "/reports/year-comparison?month=2026-06"
    );

    const row = (res.body.rows as YcRow[]).find(
      (r) => r.category === "Groceries"
    );
    expect(row).toEqual({
      category: "Groceries",
      thisYear: 3000,
      lastYear: 4000,
    });
  });

  it("returns rows sorted by thisYear descending", async () => {
    const giro = await createAccount();
    await addTransaction(giro.id, -1000, "2026-03-01", "Small");
    await addTransaction(giro.id, -5000, "2026-03-01", "Big");
    await addTransaction(giro.id, -3000, "2026-03-01", "Mid");

    const res = await request(app).get(
      "/reports/year-comparison?month=2026-06"
    );

    const categories = (res.body.rows as YcRow[]).map((r) => r.category);
    expect(categories).toEqual(["Big", "Mid", "Small"]);
  });

  it("caps the result at five categories", async () => {
    const giro = await createAccount();
    for (let i = 1; i <= 6; i++) {
      await addTransaction(giro.id, -i * 100, "2026-03-01", `C${i}`);
    }

    const res = await request(app).get(
      "/reports/year-comparison?month=2026-06"
    );

    expect((res.body.rows as YcRow[]).length).toBeLessThanOrEqual(5);
  });

  it("ignores Mortgage and Investment accounts (independent of account tabs)", async () => {
    const giro = await createAccount();
    const mort = await createAccount({
      kind: "Mortgage",
      name: "Darlehen",
      openingBalance: -4000000,
    });
    await addTransaction(giro.id, -1000, "2026-03-01", "Groceries");
    await addTransaction(mort.id, -50000, "2026-03-01", "Groceries");

    const res = await request(app).get(
      "/reports/year-comparison?month=2026-06"
    );

    const row = (res.body.rows as YcRow[]).find(
      (r) => r.category === "Groceries"
    );
    expect(row?.thisYear).toBe(1000);
  });
});

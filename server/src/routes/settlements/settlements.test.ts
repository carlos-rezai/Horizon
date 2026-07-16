import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { createSqliteAppHandle } from "../../testing/sqliteApp.js";
import { createStorage } from "../../storage/index.js";
import { createApp } from "../../app.js";

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
      openingBalance: 500000,
      openingDate: "2026-01-01",
      ...overrides,
    });
  return res.body as { id: string };
}

async function seedCcWithSpending() {
  const giro = await createAccount({
    kind: "Girokonto",
    openingBalance: 500000,
  });
  const cc = await createAccount({
    kind: "CreditCard",
    name: "Visa",
    openingBalance: 0,
    openingDate: "2026-01-01",
    linkedAccountId: giro.id,
    settlementDay: 15,
  });

  await request(app).post(`/accounts/${cc.id}/transactions`).send({
    date: "2026-01-20",
    amount: -10000,
    description: "Supermarket",
    category: "Food",
  });

  return { giro, cc };
}

// ---------------------------------------------------------------------------
// POST /settlements/generate
// ---------------------------------------------------------------------------

describe("POST /settlements/generate", () => {
  it("returns the count of newly created settlement pairs", async () => {
    await seedCcWithSpending();

    const res = await request(app).post("/settlements/generate");

    expect(res.status).toBe(200);
    expect(res.body.count).toBe(1);
  });

  it("is idempotent — second call with no changes returns count 0", async () => {
    await seedCcWithSpending();

    await request(app).post("/settlements/generate");
    const res2 = await request(app).post("/settlements/generate");

    expect(res2.status).toBe(200);
    expect(res2.body.count).toBe(0);
  });

  it("created settlement transactions have isAutoSettlement: true", async () => {
    const { cc } = await seedCcWithSpending();

    await request(app).post("/settlements/generate");

    const txRes = await request(app).get(`/accounts/${cc.id}/transactions`);
    const settlementTx = (
      txRes.body as Array<{ isAutoSettlement?: boolean }>
    ).find((tx) => tx.isAutoSettlement === true);
    expect(settlementTx).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// GET /settlements/warnings
// ---------------------------------------------------------------------------

describe("GET /settlements/warnings", () => {
  it("returns 200 with an empty array when the Funding Account balance is sufficient", async () => {
    // Giro has 500000 — well above the upcoming 10000 settlement
    const giro = await createAccount({
      kind: "Girokonto",
      openingBalance: 500000,
    });
    const cc = await createAccount({
      kind: "CreditCard",
      name: "Visa",
      openingBalance: 0,
      openingDate: "2026-01-01",
      linkedAccountId: giro.id,
      settlementDay: 15,
    });
    await request(app).post(`/accounts/${cc.id}/transactions`).send({
      date: "2026-01-20",
      amount: -10000,
      description: "Supermarket",
      category: "Food",
    });

    const res = await request(app).get("/settlements/warnings");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("returns 200 with one InsufficientFundsWarning when Giro balance cannot cover the upcoming settlement", async () => {
    // Giro opening balance is 5000; CC will owe 50000 — Giro cannot cover it
    const now = new Date();
    const openingDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

    const giro = await createAccount({
      kind: "Girokonto",
      openingBalance: 5000,
      openingDate,
    });
    const cc = await createAccount({
      kind: "CreditCard",
      name: "Visa",
      openingBalance: -50000,
      openingDate,
      linkedAccountId: giro.id,
      settlementDay: 15,
    });

    const res = await request(app).get("/settlements/warnings");

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].ccAccountId).toBe(cc.id);
    expect(res.body[0].fundingAccountId).toBe(giro.id);
    expect(res.body[0].settlementAmount).toBe(50000);
  });
});

// ---------------------------------------------------------------------------
// Startup backfill (AC 9: Express startup runs the generation service)
// ---------------------------------------------------------------------------

describe("createApp startup backfill", () => {
  it("backfills missing settlements before routes are opened", async () => {
    const storage = await createStorage({ path: ":memory:" });

    const giro = await storage.accounts.create({
      kind: "Girokonto",
      name: "Giro",
      openingBalance: 500000,
      openingDate: "2026-01-01",
    });
    const cc = await storage.accounts.create({
      kind: "CreditCard",
      name: "CC",
      openingBalance: 0,
      openingDate: "2026-01-01",
      linkedAccountId: giro.id,
      settlementDay: 15,
    });
    await storage.transactions.create(cc.id, {
      date: "2026-01-20",
      amount: -10000,
      description: "Shopping",
      category: "Food",
    });

    // createApp runs the settlement service as part of startup
    await createApp(storage);

    const txns = await storage.transactions.findByAccount(cc.id);
    expect(txns.some((tx) => tx.isAutoSettlement)).toBe(true);

    await storage.close();
  });
});

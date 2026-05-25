import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { createSqliteAppHandle } from "../testing/sqliteApp.js";

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
// POST /accounts
// ---------------------------------------------------------------------------

describe("POST /accounts", () => {
  it("saves icon and color when both are provided", async () => {
    const res = await request(app).post("/accounts").send({
      kind: "Girokonto",
      name: "Main",
      openingBalance: 0,
      openingDate: "2026-03-01",
      icon: "Wallet",
      color: "#adc6ff",
    });

    expect(res.status).toBe(201);
    expect(res.body.icon).toBe("Wallet");
    expect(res.body.color).toBe("#adc6ff");
  });

  it("saves null icon when icon is omitted", async () => {
    const res = await request(app).post("/accounts").send({
      kind: "Girokonto",
      name: "Main",
      openingBalance: 0,
      openingDate: "2026-03-01",
    });

    expect(res.status).toBe(201);
    expect(res.body.icon).toBeNull();
  });

  it("creates a Girokonto and returns it", async () => {
    const res = await request(app).post("/accounts").send({
      kind: "Girokonto",
      name: "Main",
      openingBalance: 537685,
      openingDate: "2026-03-01",
    });

    expect(res.status).toBe(201);
    expect(res.body.kind).toBe("Girokonto");
    expect(res.body.name).toBe("Main");
    expect(res.body.openingBalance).toBe(537685);
    expect(res.body.id).toBeDefined();
  });

  it("creates two Girokontos with different names", async () => {
    await request(app).post("/accounts").send({
      kind: "Girokonto",
      name: "Main",
      openingBalance: 537685,
      openingDate: "2026-03-01",
    });

    await request(app).post("/accounts").send({
      kind: "Girokonto",
      name: "Sparkasse",
      openingBalance: 46000,
      openingDate: "2026-03-01",
    });

    const res = await request(app).get("/accounts");
    const names = res.body.map((a: { name: string }) => a.name);
    expect(names).toContain("Main");
    expect(names).toContain("Sparkasse");
    expect(res.body).toHaveLength(2);
  });

  it("creates a Mortgage with sondertilgungAllowance", async () => {
    const res = await request(app).post("/accounts").send({
      kind: "Mortgage",
      name: "Darlehen",
      openingBalance: 4009661,
      openingDate: "2026-03-01",
      sondertilgungAllowance: 650000,
    });

    expect(res.status).toBe(201);
    expect(res.body.kind).toBe("Mortgage");
    expect(res.body.sondertilgungAllowance).toBe(650000);
  });

  it("stores openingBalance as an integer (cents)", async () => {
    const res = await request(app).post("/accounts").send({
      kind: "Tagesgeld",
      name: "DKB Tagesgeld",
      openingBalance: 100300,
      openingDate: "2026-03-01",
    });

    expect(res.status).toBe(201);
    expect(Number.isInteger(res.body.openingBalance)).toBe(true);
  });

  it("returns 400 when required fields are missing", async () => {
    const res = await request(app).post("/accounts").send({
      name: "Missing kind and balance",
    });

    expect(res.status).toBe(400);
  });

  it("returns 400 with a Zod issues array on a malformed body", async () => {
    const res = await request(app).post("/accounts").send({
      kind: "NotARealKind",
      name: "Bad",
      openingBalance: "not-a-number",
      openingDate: "2026-03-01",
    });

    expect(res.status).toBe(400);
    expect(Array.isArray(res.body.issues)).toBe(true);
    expect(res.body.issues.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// GET /accounts
// ---------------------------------------------------------------------------

describe("GET /accounts", () => {
  it("returns empty array when no accounts exist", async () => {
    const res = await request(app).get("/accounts");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("returns all accounts with balance equal to openingBalance", async () => {
    await request(app).post("/accounts").send({
      kind: "Girokonto",
      name: "Main",
      openingBalance: 537685,
      openingDate: "2026-03-01",
    });

    const res = await request(app).get("/accounts");

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].balance).toBe(537685);
  });

  it("includes icon and color on each account", async () => {
    await request(app).post("/accounts").send({
      kind: "Girokonto",
      name: "Main",
      openingBalance: 0,
      openingDate: "2026-03-01",
      icon: "PiggyBank",
      color: "#4edea3",
    });

    const res = await request(app).get("/accounts");

    expect(res.status).toBe(200);
    expect(res.body[0].icon).toBe("PiggyBank");
    expect(res.body[0].color).toBe("#4edea3");
  });

  it("returns openingDate as an ISO string", async () => {
    await request(app).post("/accounts").send({
      kind: "Girokonto",
      name: "Main",
      openingBalance: 537685,
      openingDate: "2026-03-01",
    });

    const res = await request(app).get("/accounts");

    expect(typeof res.body[0].openingDate).toBe("string");
    expect(() => new Date(res.body[0].openingDate)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// GET /accounts/:id
// ---------------------------------------------------------------------------

describe("GET /accounts/:id", () => {
  it("returns a single account by id", async () => {
    const created = await request(app).post("/accounts").send({
      kind: "CreditCard",
      name: "Visa",
      openingBalance: 0,
      openingDate: "2026-03-01",
    });

    const res = await request(app).get(`/accounts/${created.body.id}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(created.body.id);
    expect(res.body.name).toBe("Visa");
  });

  it("includes icon and color on a single account", async () => {
    const created = await request(app).post("/accounts").send({
      kind: "Tagesgeld",
      name: "Reserve",
      openingBalance: 0,
      openingDate: "2026-03-01",
      icon: "Home",
      color: "#ffb786",
    });

    const res = await request(app).get(`/accounts/${created.body.id}`);

    expect(res.status).toBe(200);
    expect(res.body.icon).toBe("Home");
    expect(res.body.color).toBe("#ffb786");
  });

  it("returns 404 for an unknown id", async () => {
    const res = await request(app).get("/accounts/000000000000000000000000");

    expect(res.status).toBe(404);
  });

  it("returns 404 for a malformed id (no throw, no 500)", async () => {
    const res = await request(app).get("/accounts/not-an-object-id");

    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// PATCH /accounts/:id
// ---------------------------------------------------------------------------

describe("PATCH /accounts/:id", () => {
  it("updates the account name", async () => {
    const created = await request(app).post("/accounts").send({
      kind: "Girokonto",
      name: "Old Name",
      openingBalance: 100000,
      openingDate: "2026-03-01",
    });

    const res = await request(app)
      .patch(`/accounts/${created.body.id}`)
      .send({ name: "New Name" });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe("New Name");
  });

  it("updates icon and color", async () => {
    const created = await request(app).post("/accounts").send({
      kind: "Girokonto",
      name: "Main",
      openingBalance: 0,
      openingDate: "2026-03-01",
    });

    const res = await request(app)
      .patch(`/accounts/${created.body.id}`)
      .send({ icon: "TrendingUp", color: "#c2c6d6" });

    expect(res.status).toBe(200);
    expect(res.body.icon).toBe("TrendingUp");
    expect(res.body.color).toBe("#c2c6d6");
  });

  it("returns 404 for an unknown id", async () => {
    const res = await request(app)
      .patch("/accounts/000000000000000000000000")
      .send({ name: "Ghost" });

    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// DELETE /accounts/:id
// ---------------------------------------------------------------------------

describe("DELETE /accounts/:id", () => {
  it("deletes an account with no transactions", async () => {
    const created = await request(app).post("/accounts").send({
      kind: "Investment",
      name: "MSCI World",
      openingBalance: 0,
      openingDate: "2026-03-01",
    });

    const res = await request(app).delete(`/accounts/${created.body.id}`);

    expect(res.status).toBe(204);

    const check = await request(app).get(`/accounts/${created.body.id}`);
    expect(check.status).toBe(404);
  });

  it("returns 404 for an unknown id", async () => {
    const res = await request(app).delete("/accounts/000000000000000000000000");

    expect(res.status).toBe(404);
  });

  it("returns 409 when the account has transactions", async () => {
    const created = await request(app).post("/accounts").send({
      kind: "Girokonto",
      name: "Main",
      openingBalance: 100000,
      openingDate: "2026-03-01",
    });

    await request(app).post(`/accounts/${created.body.id}/transactions`).send({
      date: "2026-03-15",
      amount: -1000,
      description: "Coffee",
      category: "Food",
    });

    const res = await request(app).delete(`/accounts/${created.body.id}`);

    expect(res.status).toBe(409);
  });
});

// ---------------------------------------------------------------------------
// POST /accounts — CreditCard settlement configuration
// ---------------------------------------------------------------------------

describe("POST /accounts — CreditCard settlement configuration", () => {
  it("saves full settlement config and sets linkedSince to openingDate", async () => {
    const girokonto = await request(app).post("/accounts").send({
      kind: "Girokonto",
      name: "Funding",
      openingBalance: 100000,
      openingDate: "2026-01-01",
    });

    const res = await request(app).post("/accounts").send({
      kind: "CreditCard",
      name: "Visa",
      openingBalance: 0,
      openingDate: "2026-03-01",
      linkedAccountId: girokonto.body.id,
      settlementDay: 17,
    });

    expect(res.status).toBe(201);
    expect(res.body.linkedAccountId).toBe(girokonto.body.id);
    expect(res.body.settlementDay).toBe(17);
    expect(res.body.linkedSince).toBe("2026-03-01");
  });

  it("returns 400 when only linkedAccountId is provided without settlementDay", async () => {
    const girokonto = await request(app).post("/accounts").send({
      kind: "Girokonto",
      name: "Funding",
      openingBalance: 100000,
      openingDate: "2026-01-01",
    });

    const res = await request(app).post("/accounts").send({
      kind: "CreditCard",
      name: "Visa",
      openingBalance: 0,
      openingDate: "2026-03-01",
      linkedAccountId: girokonto.body.id,
    });

    expect(res.status).toBe(400);
  });

  it("returns 400 when only settlementDay is provided without linkedAccountId", async () => {
    const res = await request(app).post("/accounts").send({
      kind: "CreditCard",
      name: "Visa",
      openingBalance: 0,
      openingDate: "2026-03-01",
      settlementDay: 17,
    });

    expect(res.status).toBe(400);
  });

  it("saves CreditCard with no settlement config and returns null for all settlement fields", async () => {
    const res = await request(app).post("/accounts").send({
      kind: "CreditCard",
      name: "Visa",
      openingBalance: 0,
      openingDate: "2026-03-01",
    });

    expect(res.status).toBe(201);
    expect(res.body.linkedAccountId).toBeNull();
    expect(res.body.settlementDay).toBeNull();
    expect(res.body.linkedSince).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// GET /accounts/:id — CreditCard settlement fields
// ---------------------------------------------------------------------------

describe("GET /accounts/:id — CreditCard settlement fields", () => {
  it("returns linkedAccountId, settlementDay, and linkedSince for a configured CreditCard", async () => {
    const girokonto = await request(app).post("/accounts").send({
      kind: "Girokonto",
      name: "Funding",
      openingBalance: 100000,
      openingDate: "2026-01-01",
    });

    const created = await request(app).post("/accounts").send({
      kind: "CreditCard",
      name: "Visa",
      openingBalance: 0,
      openingDate: "2026-03-01",
      linkedAccountId: girokonto.body.id,
      settlementDay: 17,
    });

    const res = await request(app).get(`/accounts/${created.body.id}`);

    expect(res.status).toBe(200);
    expect(res.body.linkedAccountId).toBe(girokonto.body.id);
    expect(res.body.settlementDay).toBe(17);
    expect(res.body.linkedSince).toBe("2026-03-01");
  });

  it("returns null for all settlement fields when CreditCard has no settlement config", async () => {
    const created = await request(app).post("/accounts").send({
      kind: "CreditCard",
      name: "Visa",
      openingBalance: 0,
      openingDate: "2026-03-01",
    });

    const res = await request(app).get(`/accounts/${created.body.id}`);

    expect(res.status).toBe(200);
    expect(res.body.linkedAccountId).toBeNull();
    expect(res.body.settlementDay).toBeNull();
    expect(res.body.linkedSince).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// PATCH /accounts/:id — CreditCard settlement configuration
// ---------------------------------------------------------------------------

describe("PATCH /accounts/:id — CreditCard settlement configuration", () => {
  it("resets linkedSince to today when settlementDay changes", async () => {
    const today = new Date().toISOString().slice(0, 10);
    const girokonto = await request(app).post("/accounts").send({
      kind: "Girokonto",
      name: "Funding",
      openingBalance: 100000,
      openingDate: "2026-01-01",
    });
    const created = await request(app).post("/accounts").send({
      kind: "CreditCard",
      name: "Visa",
      openingBalance: 0,
      openingDate: "2025-01-01",
      linkedAccountId: girokonto.body.id,
      settlementDay: 10,
    });

    const res = await request(app)
      .patch(`/accounts/${created.body.id}`)
      .send({ settlementDay: 20 });

    expect(res.status).toBe(200);
    expect(res.body.settlementDay).toBe(20);
    expect(res.body.linkedSince).toBe(today);
  });

  it("resets linkedSince to today when linkedAccountId changes", async () => {
    const today = new Date().toISOString().slice(0, 10);
    const girokonto1 = await request(app).post("/accounts").send({
      kind: "Girokonto",
      name: "Funding 1",
      openingBalance: 100000,
      openingDate: "2026-01-01",
    });
    const girokonto2 = await request(app).post("/accounts").send({
      kind: "Girokonto",
      name: "Funding 2",
      openingBalance: 50000,
      openingDate: "2026-01-01",
    });
    const created = await request(app).post("/accounts").send({
      kind: "CreditCard",
      name: "Visa",
      openingBalance: 0,
      openingDate: "2025-01-01",
      linkedAccountId: girokonto1.body.id,
      settlementDay: 17,
    });

    const res = await request(app)
      .patch(`/accounts/${created.body.id}`)
      .send({ linkedAccountId: girokonto2.body.id });

    expect(res.status).toBe(200);
    expect(res.body.linkedAccountId).toBe(girokonto2.body.id);
    expect(res.body.linkedSince).toBe(today);
  });

  it("clears all settlement fields when linkedAccountId is patched to null", async () => {
    const girokonto = await request(app).post("/accounts").send({
      kind: "Girokonto",
      name: "Funding",
      openingBalance: 100000,
      openingDate: "2026-01-01",
    });
    const created = await request(app).post("/accounts").send({
      kind: "CreditCard",
      name: "Visa",
      openingBalance: 0,
      openingDate: "2026-03-01",
      linkedAccountId: girokonto.body.id,
      settlementDay: 17,
    });

    const res = await request(app)
      .patch(`/accounts/${created.body.id}`)
      .send({ linkedAccountId: null });

    expect(res.status).toBe(200);
    expect(res.body.linkedAccountId).toBeNull();
    expect(res.body.settlementDay).toBeNull();
    expect(res.body.linkedSince).toBeNull();
  });
});

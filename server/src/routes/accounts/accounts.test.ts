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
      anchorBalance: 0,
      anchorDate: "2026-03-01",
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
      anchorBalance: 0,
      anchorDate: "2026-03-01",
    });

    expect(res.status).toBe(201);
    expect(res.body.icon).toBeNull();
  });

  it("creates a Girokonto and returns it", async () => {
    const res = await request(app).post("/accounts").send({
      kind: "Girokonto",
      name: "Main",
      anchorBalance: 537685,
      anchorDate: "2026-03-01",
    });

    expect(res.status).toBe(201);
    expect(res.body.kind).toBe("Girokonto");
    expect(res.body.name).toBe("Main");
    expect(res.body.anchorBalance).toBe(537685);
    expect(res.body.id).toBeDefined();
  });

  it("creates two Girokontos with different names", async () => {
    await request(app).post("/accounts").send({
      kind: "Girokonto",
      name: "Main",
      anchorBalance: 537685,
      anchorDate: "2026-03-01",
    });

    await request(app).post("/accounts").send({
      kind: "Girokonto",
      name: "Sparkasse",
      anchorBalance: 46000,
      anchorDate: "2026-03-01",
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
      anchorBalance: 4009661,
      anchorDate: "2026-03-01",
      sondertilgungAllowance: 650000,
    });

    expect(res.status).toBe(201);
    expect(res.body.kind).toBe("Mortgage");
    expect(res.body.sondertilgungAllowance).toBe(650000);
  });

  it("stores anchorBalance as an integer (cents)", async () => {
    const res = await request(app).post("/accounts").send({
      kind: "Tagesgeld",
      name: "DKB Tagesgeld",
      anchorBalance: 100300,
      anchorDate: "2026-03-01",
    });

    expect(res.status).toBe(201);
    expect(Number.isInteger(res.body.anchorBalance)).toBe(true);
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
      anchorBalance: "not-a-number",
      anchorDate: "2026-03-01",
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

  it("returns all accounts with balance equal to anchorBalance", async () => {
    await request(app).post("/accounts").send({
      kind: "Girokonto",
      name: "Main",
      anchorBalance: 537685,
      anchorDate: "2026-03-01",
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
      anchorBalance: 0,
      anchorDate: "2026-03-01",
      icon: "PiggyBank",
      color: "#4edea3",
    });

    const res = await request(app).get("/accounts");

    expect(res.status).toBe(200);
    expect(res.body[0].icon).toBe("PiggyBank");
    expect(res.body[0].color).toBe("#4edea3");
  });

  it("returns anchorDate as an ISO string", async () => {
    await request(app).post("/accounts").send({
      kind: "Girokonto",
      name: "Main",
      anchorBalance: 537685,
      anchorDate: "2026-03-01",
    });

    const res = await request(app).get("/accounts");

    expect(typeof res.body[0].anchorDate).toBe("string");
    expect(() => new Date(res.body[0].anchorDate)).not.toThrow();
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
      anchorBalance: 0,
      anchorDate: "2026-03-01",
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
      anchorBalance: 0,
      anchorDate: "2026-03-01",
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
      anchorBalance: 100000,
      anchorDate: "2026-03-01",
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
      anchorBalance: 0,
      anchorDate: "2026-03-01",
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
// PATCH /accounts/reorder
// ---------------------------------------------------------------------------

describe("PATCH /accounts/reorder", () => {
  async function createThree(): Promise<[string, string, string]> {
    const a = await request(app).post("/accounts").send({
      kind: "Girokonto",
      name: "A",
      anchorBalance: 100000,
      anchorDate: "2026-03-01",
    });
    const b = await request(app).post("/accounts").send({
      kind: "Tagesgeld",
      name: "B",
      anchorBalance: 200000,
      anchorDate: "2026-03-01",
    });
    const c = await request(app).post("/accounts").send({
      kind: "Investment",
      name: "C",
      anchorBalance: 300000,
      anchorDate: "2026-03-01",
    });
    return [a.body.id, b.body.id, c.body.id];
  }

  it("reorders accounts and GET /accounts reflects the new order", async () => {
    const [a, b, c] = await createThree();

    const res = await request(app)
      .patch("/accounts/reorder")
      .send({ orderedIds: [c, a, b] });

    expect(res.status).toBe(200);

    const list = await request(app).get("/accounts");
    expect(list.body.map((acc: { id: string }) => acc.id)).toEqual([c, a, b]);
  });

  it("returns the reordered accounts in the response body", async () => {
    const [a, b, c] = await createThree();

    const res = await request(app)
      .patch("/accounts/reorder")
      .send({ orderedIds: [b, c, a] });

    expect(res.status).toBe(200);
    expect(res.body.map((acc: { id: string }) => acc.id)).toEqual([b, c, a]);
  });

  it("returns 400 when orderedIds is missing", async () => {
    const res = await request(app).patch("/accounts/reorder").send({});

    expect(res.status).toBe(400);
  });

  it("returns 400 when orderedIds is not an array of strings", async () => {
    const res = await request(app)
      .patch("/accounts/reorder")
      .send({ orderedIds: "not-an-array" });

    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// PATCH /accounts/:id/mortgage
// ---------------------------------------------------------------------------

describe("PATCH /accounts/:id/mortgage", () => {
  async function createMortgage(anchorBalance = 30000000): Promise<string> {
    const res = await request(app).post("/accounts").send({
      kind: "Mortgage",
      name: "Haus",
      anchorBalance,
      anchorDate: "2026-01-01",
    });
    return res.body.id;
  }

  it("sets origination fields and returns the updated account", async () => {
    const id = await createMortgage(30000000);

    const res = await request(app).patch(`/accounts/${id}/mortgage`).send({
      originalPrincipal: 45000000,
      startDate: "2020-06-01",
      termYears: 25,
    });

    expect(res.status).toBe(200);
    expect(res.body.originalPrincipal).toBe(45000000);
    expect(res.body.startDate).toBe("2020-06-01");
    expect(res.body.termYears).toBe(25);
  });

  it("returns 400 with an error body when originalPrincipal is below the current Restschuld", async () => {
    const id = await createMortgage(30000000);

    const res = await request(app).patch(`/accounts/${id}/mortgage`).send({
      originalPrincipal: 29999999,
      startDate: "2020-06-01",
      termYears: 25,
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/restschuld|principal/i);
  });

  it("returns 400 with issues when the body is invalid", async () => {
    const id = await createMortgage(30000000);

    const res = await request(app)
      .patch(`/accounts/${id}/mortgage`)
      .send({ originalPrincipal: "lots", termYears: 25 });

    expect(res.status).toBe(400);
    expect(res.body.issues).toBeDefined();
  });

  it("returns 404 with an error body for an unknown account id", async () => {
    const res = await request(app)
      .patch("/accounts/00000000-0000-4000-8000-999999999999/mortgage")
      .send({
        originalPrincipal: 45000000,
        startDate: "2020-06-01",
        termYears: 25,
      });

    expect(res.status).toBe(404);
    expect(res.body.error).toBeDefined();
  });

  it("returns 404 with an error body when the account is not a Mortgage", async () => {
    const giro = await request(app).post("/accounts").send({
      kind: "Girokonto",
      name: "Main",
      anchorBalance: 100000,
      anchorDate: "2026-01-01",
    });

    const res = await request(app)
      .patch(`/accounts/${giro.body.id}/mortgage`)
      .send({
        originalPrincipal: 100000,
        startDate: "2020-06-01",
        termYears: 25,
      });

    expect(res.status).toBe(404);
    expect(res.body.error).toBeDefined();
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
      anchorBalance: 0,
      anchorDate: "2026-03-01",
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
      anchorBalance: 100000,
      anchorDate: "2026-03-01",
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
  it("saves full settlement config and sets linkedSince to anchorDate", async () => {
    const girokonto = await request(app).post("/accounts").send({
      kind: "Girokonto",
      name: "Funding",
      anchorBalance: 100000,
      anchorDate: "2026-01-01",
    });

    const res = await request(app).post("/accounts").send({
      kind: "CreditCard",
      name: "Visa",
      anchorBalance: 0,
      anchorDate: "2026-03-01",
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
      anchorBalance: 100000,
      anchorDate: "2026-01-01",
    });

    const res = await request(app).post("/accounts").send({
      kind: "CreditCard",
      name: "Visa",
      anchorBalance: 0,
      anchorDate: "2026-03-01",
      linkedAccountId: girokonto.body.id,
    });

    expect(res.status).toBe(400);
  });

  it("returns 400 when only settlementDay is provided without linkedAccountId", async () => {
    const res = await request(app).post("/accounts").send({
      kind: "CreditCard",
      name: "Visa",
      anchorBalance: 0,
      anchorDate: "2026-03-01",
      settlementDay: 17,
    });

    expect(res.status).toBe(400);
  });

  it("saves CreditCard with no settlement config and returns null for all settlement fields", async () => {
    const res = await request(app).post("/accounts").send({
      kind: "CreditCard",
      name: "Visa",
      anchorBalance: 0,
      anchorDate: "2026-03-01",
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
      anchorBalance: 100000,
      anchorDate: "2026-01-01",
    });

    const created = await request(app).post("/accounts").send({
      kind: "CreditCard",
      name: "Visa",
      anchorBalance: 0,
      anchorDate: "2026-03-01",
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
      anchorBalance: 0,
      anchorDate: "2026-03-01",
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
      anchorBalance: 100000,
      anchorDate: "2026-01-01",
    });
    const created = await request(app).post("/accounts").send({
      kind: "CreditCard",
      name: "Visa",
      anchorBalance: 0,
      anchorDate: "2025-01-01",
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
      anchorBalance: 100000,
      anchorDate: "2026-01-01",
    });
    const girokonto2 = await request(app).post("/accounts").send({
      kind: "Girokonto",
      name: "Funding 2",
      anchorBalance: 50000,
      anchorDate: "2026-01-01",
    });
    const created = await request(app).post("/accounts").send({
      kind: "CreditCard",
      name: "Visa",
      anchorBalance: 0,
      anchorDate: "2025-01-01",
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
      anchorBalance: 100000,
      anchorDate: "2026-01-01",
    });
    const created = await request(app).post("/accounts").send({
      kind: "CreditCard",
      name: "Visa",
      anchorBalance: 0,
      anchorDate: "2026-03-01",
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

describe("POST /accounts — Balance Anchor fields", () => {
  it("creates an account from anchorBalance / anchorDate and answers them back", async () => {
    const res = await request(app).post("/accounts").send({
      kind: "Girokonto",
      name: "Main",
      anchorBalance: 254321,
      anchorDate: "2026-03-01",
    });

    expect(res.status).toBe(201);
    expect(res.body.anchorBalance).toBe(254321);
    expect(res.body.anchorDate).toBe("2026-03-01");
    expect(res.body).not.toHaveProperty("opening" + "Balance");
    expect(res.body).not.toHaveProperty("opening" + "Date");

    const stored = await request(app).get(`/accounts/${res.body.id}`);
    expect(stored.status).toBe(200);
    expect(stored.body.anchorBalance).toBe(254321);
    expect(stored.body.anchorDate).toBe("2026-03-01");
    expect(stored.body.balance).toBe(254321);
  });
});

// ---------------------------------------------------------------------------
// Re-anchoring — anchorDate ≤ today on create and update (#231)
// ---------------------------------------------------------------------------

/** Today as an ISO date, the same idiom the routes use for linkedSince. */
function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** An ISO date `days` after today. */
function isoDaysFromToday(days: number): string {
  const d = new Date(`${todayIso()}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

describe("POST /accounts — Anchor Date not later than today", () => {
  it("answers 400 for an anchorDate later than today", async () => {
    const res = await request(app)
      .post("/accounts")
      .send({
        kind: "Girokonto",
        name: "Main",
        anchorBalance: 100000,
        anchorDate: isoDaysFromToday(1),
      });

    expect(res.status).toBe(400);
  });
});

describe("POST /accounts — Anchor Date is an ISO date", () => {
  it("answers 400 for an anchorDate that is not an ISO date", async () => {
    const res = await request(app).post("/accounts").send({
      kind: "Girokonto",
      name: "Main",
      anchorBalance: 100000,
      anchorDate: "16.10.2026",
    });

    expect(res.status).toBe(400);
  });
});

describe("PATCH /accounts/:id — re-anchoring", () => {
  async function createGirokonto(): Promise<string> {
    const created = await request(app).post("/accounts").send({
      kind: "Girokonto",
      name: "Main",
      anchorBalance: 100000,
      anchorDate: "2026-01-01",
    });
    expect(created.status).toBe(201);
    return created.body.id as string;
  }

  it("answers 400 for an anchorDate later than today and keeps the old anchor", async () => {
    const id = await createGirokonto();

    const res = await request(app)
      .patch(`/accounts/${id}`)
      .send({ anchorDate: isoDaysFromToday(1) });

    expect(res.status).toBe(400);
    const stored = await request(app).get(`/accounts/${id}`);
    expect(stored.body.anchorDate).toBe("2026-01-01");
  });

  it("persists a past anchorDate (a statement's end date) with its anchorBalance", async () => {
    const id = await createGirokonto();

    const res = await request(app)
      .patch(`/accounts/${id}`)
      .send({ anchorBalance: 254321, anchorDate: "2026-03-31" });

    expect(res.status).toBe(200);
    expect(res.body.anchorBalance).toBe(254321);
    expect(res.body.anchorDate).toBe("2026-03-31");

    const stored = await request(app).get(`/accounts/${id}`);
    expect(stored.body.anchorBalance).toBe(254321);
    expect(stored.body.anchorDate).toBe("2026-03-31");
  });

  it("persists a changed anchorDate sent on its own", async () => {
    const id = await createGirokonto();

    const res = await request(app)
      .patch(`/accounts/${id}`)
      .send({ anchorDate: "2026-02-15" });

    expect(res.status).toBe(200);
    const stored = await request(app).get(`/accounts/${id}`);
    expect(stored.body.anchorDate).toBe("2026-02-15");
    expect(stored.body.anchorBalance).toBe(100000);
  });

  it("replaces the anchor: the Current Balance follows the new anchor, not the old one", async () => {
    const id = await createGirokonto();

    const before = await request(app)
      .post(`/accounts/${id}/transactions`)
      .send({
        date: "2026-02-10",
        amount: -20000,
        description: "Rent share",
        category: "Food",
      });
    expect(before.status).toBe(201);
    const after = await request(app).post(`/accounts/${id}/transactions`).send({
      date: "2026-04-10",
      amount: -5000,
      description: "Groceries",
      category: "Food",
    });
    expect(after.status).toBe(201);

    // Re-anchor to a statement's closing Saldo on 2026-03-31: the February
    // transaction is absorbed into the new anchor, the April one still counts.
    const res = await request(app)
      .patch(`/accounts/${id}`)
      .send({ anchorBalance: 500000, anchorDate: "2026-03-31" });
    expect(res.status).toBe(200);

    const stored = await request(app).get(`/accounts/${id}`);
    expect(stored.body.anchorBalance).toBe(500000);
    expect(stored.body.anchorDate).toBe("2026-03-31");
    expect(stored.body.balance).toBe(495000);
  });
});

describe("Anchor Date — today is the local calendar date", () => {
  // 00:30 local time on 16 Oct 2026. East of UTC this is still 15 Oct in UTC,
  // so a UTC "today" would wrongly reject the local date as later than today.
  // Only `Date` is faked: supertest needs real timers for its socket.
  afterEach(() => {
    vi.useRealTimers();
  });

  function freezeJustAfterMidnight(): void {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 16, 0, 30));
  }

  it("POST /accounts accepts today's local date just after midnight", async () => {
    freezeJustAfterMidnight();

    const res = await request(app).post("/accounts").send({
      kind: "Girokonto",
      name: "Main",
      anchorBalance: 100000,
      anchorDate: "2026-10-16",
    });

    expect(res.status).toBe(201);
  });

  it("POST /accounts still rejects the following day", async () => {
    freezeJustAfterMidnight();

    const res = await request(app).post("/accounts").send({
      kind: "Girokonto",
      name: "Main",
      anchorBalance: 100000,
      anchorDate: "2026-10-17",
    });

    expect(res.status).toBe(400);
  });

  it("PATCH /accounts/:id accepts today's local date just after midnight", async () => {
    freezeJustAfterMidnight();
    const created = await request(app).post("/accounts").send({
      kind: "Girokonto",
      name: "Main",
      anchorBalance: 100000,
      anchorDate: "2026-01-01",
    });
    expect(created.status).toBe(201);

    const res = await request(app)
      .patch(`/accounts/${created.body.id as string}`)
      .send({ anchorDate: "2026-10-16" });

    expect(res.status).toBe(200);
  });

  it("PATCH /accounts/:id still rejects the following day", async () => {
    freezeJustAfterMidnight();
    const created = await request(app).post("/accounts").send({
      kind: "Girokonto",
      name: "Main",
      anchorBalance: 100000,
      anchorDate: "2026-01-01",
    });
    expect(created.status).toBe(201);

    const res = await request(app)
      .patch(`/accounts/${created.body.id as string}`)
      .send({ anchorDate: "2026-10-17" });

    expect(res.status).toBe(400);
  });
});

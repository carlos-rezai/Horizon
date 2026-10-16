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

async function createAccount(): Promise<string> {
  const res = await request(app).post("/accounts").send({
    kind: "Girokonto",
    name: "Main",
    openingBalance: 0,
    openingDate: "2026-01-01",
  });
  return res.body.id as string;
}

afterAll(async () => {
  await cleanup();
});

afterEach(async () => {
  await reset();
});

// ---------------------------------------------------------------------------
// POST /recurring-transactions
// ---------------------------------------------------------------------------

describe("POST /recurring-transactions", () => {
  it("creates a standing order and returns 201 with all fields including accountId", async () => {
    const accountId = await createAccount();
    const res = await request(app).post("/recurring-transactions").send({
      accountId,
      amount: 95000,
      description: "Rent",
      category: "Housing",
      frequency: "monthly",
      dayOfMonth: 1,
    });

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.accountId).toBe(accountId);
    expect(res.body.amount).toBe(95000);
    expect(res.body.description).toBe("Rent");
    expect(res.body.category).toBe("Housing");
    expect(res.body.frequency).toBe("monthly");
    expect(res.body.dayOfMonth).toBe(1);
    expect(res.body.isActive).toBeUndefined();
  });

  it("stores and returns linkedAccountId for a recurring transfer", async () => {
    const sourceRes = await request(app).post("/accounts").send({
      kind: "Girokonto",
      name: "Main",
      openingBalance: 0,
      openingDate: "2026-01-01",
    });
    const destRes = await request(app).post("/accounts").send({
      kind: "Tagesgeld",
      name: "Savings",
      openingBalance: 0,
      openingDate: "2026-01-01",
    });

    const res = await request(app).post("/recurring-transactions").send({
      accountId: sourceRes.body.id,
      amount: 50000,
      description: "Monthly savings transfer",
      category: "Transfer",
      frequency: "monthly",
      dayOfMonth: 5,
      linkedAccountId: destRes.body.id,
    });

    expect(res.status).toBe(201);
    expect(res.body.accountId).toBe(sourceRes.body.id);
    expect(res.body.linkedAccountId).toBe(destRes.body.id);
  });

  it("accepts quarterly frequency", async () => {
    const accountId = await createAccount();
    const res = await request(app).post("/recurring-transactions").send({
      accountId,
      amount: 30000,
      description: "Insurance",
      category: "Miscellaneous",
      frequency: "quarterly",
      dayOfMonth: 15,
    });

    expect(res.status).toBe(201);
    expect(res.body.frequency).toBe("quarterly");
  });

  it("accepts annual frequency", async () => {
    const accountId = await createAccount();
    const res = await request(app).post("/recurring-transactions").send({
      accountId,
      amount: 120000,
      description: "Annual subscription",
      category: "Subscriptions",
      frequency: "annual",
      dayOfMonth: 1,
    });

    expect(res.status).toBe(201);
    expect(res.body.frequency).toBe("annual");
  });

  it("returns 400 when accountId is missing", async () => {
    const res = await request(app).post("/recurring-transactions").send({
      amount: 95000,
      description: "Rent",
      category: "Housing",
      frequency: "monthly",
      dayOfMonth: 1,
    });

    expect(res.status).toBe(400);
  });

  it("returns 400 when other required fields are missing", async () => {
    const accountId = await createAccount();
    const res = await request(app).post("/recurring-transactions").send({
      accountId,
      amount: 95000,
      description: "Rent",
    });

    expect(res.status).toBe(400);
  });

  it("returns 404 when accountId references an unknown account", async () => {
    const res = await request(app).post("/recurring-transactions").send({
      accountId: "00000000-0000-4000-8000-999999999999",
      amount: 95000,
      description: "Rent",
      category: "Housing",
      frequency: "monthly",
      dayOfMonth: 1,
    });

    expect(res.status).toBe(404);
  });

  it("returns 404 when linkedAccountId references an unknown account", async () => {
    const accountId = await createAccount();
    const res = await request(app).post("/recurring-transactions").send({
      accountId,
      amount: 50000,
      description: "Orphan transfer",
      category: "Transfer",
      frequency: "monthly",
      dayOfMonth: 5,
      linkedAccountId: "00000000-0000-4000-8000-999999999999",
    });

    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// GET /recurring-transactions
// ---------------------------------------------------------------------------

describe("GET /recurring-transactions", () => {
  it("returns all recurring transactions and none have an isActive field", async () => {
    const accountId = await createAccount();
    await request(app).post("/recurring-transactions").send({
      accountId,
      amount: 95000,
      description: "Rent",
      category: "Housing",
      frequency: "monthly",
      dayOfMonth: 1,
    });
    await request(app).post("/recurring-transactions").send({
      accountId,
      amount: 20000,
      description: "Gym",
      category: "Subscriptions",
      frequency: "monthly",
      dayOfMonth: 10,
    });

    const res = await request(app).get("/recurring-transactions");

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    for (const rt of res.body) {
      expect(rt.isActive).toBeUndefined();
    }
  });

  it("returns an empty array when no recurring transactions exist", async () => {
    const res = await request(app).get("/recurring-transactions");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// PATCH /recurring-transactions/:id
// ---------------------------------------------------------------------------

describe("PATCH /recurring-transactions/:id", () => {
  it("updates amount, description, and category", async () => {
    const accountId = await createAccount();
    const createRes = await request(app).post("/recurring-transactions").send({
      accountId,
      amount: 95000,
      description: "Rent",
      category: "Housing",
      frequency: "monthly",
      dayOfMonth: 1,
    });
    const id = createRes.body.id;

    const res = await request(app)
      .patch(`/recurring-transactions/${id}`)
      .send({ amount: 98000, description: "New rent", category: "Housing" });

    expect(res.status).toBe(200);
    expect(res.body.amount).toBe(98000);
    expect(res.body.description).toBe("New rent");
  });

  it("returns 404 for an unknown id", async () => {
    const res = await request(app)
      .patch("/recurring-transactions/000000000000000000000000")
      .send({ amount: 10000 });

    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// DELETE /recurring-transactions/:id
// ---------------------------------------------------------------------------

describe("DELETE /recurring-transactions/:id", () => {
  it("removes the standing order permanently", async () => {
    const accountId = await createAccount();
    const createRes = await request(app).post("/recurring-transactions").send({
      accountId,
      amount: 95000,
      description: "Rent",
      category: "Housing",
      frequency: "monthly",
      dayOfMonth: 1,
    });
    const id = createRes.body.id;

    const deleteRes = await request(app).delete(
      `/recurring-transactions/${id}`
    );
    expect(deleteRes.status).toBe(204);

    const listRes = await request(app).get("/recurring-transactions");
    expect(listRes.body).toHaveLength(0);
  });

  it("returns 404 for an unknown id", async () => {
    const res = await request(app).delete(
      "/recurring-transactions/000000000000000000000000"
    );

    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// Recurring Transfer rules (issue #224)
// ---------------------------------------------------------------------------

async function createNamedAccount(name: string): Promise<string> {
  const res = await request(app).post("/accounts").send({
    kind: "Girokonto",
    name,
    openingBalance: 0,
    openingDate: "2026-01-01",
  });
  return res.body.id as string;
}

function transferBody(
  accountId: string,
  linkedAccountId: string,
  amount: number
) {
  return {
    accountId,
    linkedAccountId,
    amount,
    description: "Savings transfer",
    category: "Transfer",
    frequency: "monthly",
    dayOfMonth: 1,
  };
}

describe("POST /recurring-transactions — transfer rules", () => {
  it("rejects a negative linked amount with 400 and { issues }", async () => {
    const a = await createNamedAccount("A");
    const b = await createNamedAccount("B");

    const res = await request(app)
      .post("/recurring-transactions")
      .send(transferBody(a, b, -50000));

    expect(res.status).toBe(400);
    expect(Array.isArray(res.body.issues)).toBe(true);
    expect(res.body.issues.length).toBeGreaterThan(0);
  });

  it("rejects a zero linked amount with 400 and { issues }", async () => {
    const a = await createNamedAccount("A");
    const b = await createNamedAccount("B");

    const res = await request(app)
      .post("/recurring-transactions")
      .send(transferBody(a, b, 0));

    expect(res.status).toBe(400);
    expect(Array.isArray(res.body.issues)).toBe(true);
  });

  it("rejects a transfer linked to its own account with 400 and { issues }", async () => {
    const a = await createNamedAccount("A");

    const res = await request(app)
      .post("/recurring-transactions")
      .send(transferBody(a, a, 50000));

    expect(res.status).toBe(400);
    expect(Array.isArray(res.body.issues)).toBe(true);
  });

  it("stores nothing when a transfer is rejected", async () => {
    const a = await createNamedAccount("A");
    const b = await createNamedAccount("B");

    await request(app)
      .post("/recurring-transactions")
      .send(transferBody(a, b, -50000));
    await request(app)
      .post("/recurring-transactions")
      .send(transferBody(a, a, 50000));

    const all = await request(app).get("/recurring-transactions");
    expect(all.body).toEqual([]);
  });

  it("still accepts a negative amount on a plain recurring row", async () => {
    const a = await createNamedAccount("A");

    const res = await request(app).post("/recurring-transactions").send({
      accountId: a,
      amount: -95000,
      description: "Rent",
      category: "Housing",
      frequency: "monthly",
      dayOfMonth: 1,
    });

    expect(res.status).toBe(201);
    expect(res.body.amount).toBe(-95000);
  });
});

describe("PATCH /recurring-transactions/:id — merged-row transfer rules", () => {
  it("rejects a non-positive amount patched onto a stored transfer", async () => {
    const a = await createNamedAccount("A");
    const b = await createNamedAccount("B");
    const created = await request(app)
      .post("/recurring-transactions")
      .send(transferBody(a, b, 50000));

    const res = await request(app)
      .patch(`/recurring-transactions/${created.body.id}`)
      .send({ amount: -50000 });

    expect(res.status).toBe(400);
    expect(Array.isArray(res.body.issues)).toBe(true);

    const all = await request(app).get("/recurring-transactions");
    expect(all.body[0].amount).toBe(50000);
  });

  it("rejects linking a stored negative plain row to an account", async () => {
    const a = await createNamedAccount("A");
    const b = await createNamedAccount("B");
    const created = await request(app).post("/recurring-transactions").send({
      accountId: a,
      amount: -95000,
      description: "Rent",
      category: "Housing",
      frequency: "monthly",
      dayOfMonth: 1,
    });

    const res = await request(app)
      .patch(`/recurring-transactions/${created.body.id}`)
      .send({ linkedAccountId: b });

    expect(res.status).toBe(400);
    expect(Array.isArray(res.body.issues)).toBe(true);
  });

  it("rejects an accountId flip that would self-link", async () => {
    const a = await createNamedAccount("A");
    const b = await createNamedAccount("B");
    const created = await request(app)
      .post("/recurring-transactions")
      .send(transferBody(a, b, 50000));

    const res = await request(app)
      .patch(`/recurring-transactions/${created.body.id}`)
      .send({ accountId: b });

    expect(res.status).toBe(400);
    expect(Array.isArray(res.body.issues)).toBe(true);

    const all = await request(app).get("/recurring-transactions");
    expect(all.body[0].accountId).toBe(a);
    expect(all.body[0].linkedAccountId).toBe(b);
  });

  it("moves ownership on a valid direction flip", async () => {
    const a = await createNamedAccount("A");
    const b = await createNamedAccount("B");
    const created = await request(app)
      .post("/recurring-transactions")
      .send(transferBody(a, b, 50000));

    const res = await request(app)
      .patch(`/recurring-transactions/${created.body.id}`)
      .send({ accountId: b, linkedAccountId: a, amount: 50000 });

    expect(res.status).toBe(200);
    expect(res.body.accountId).toBe(b);
    expect(res.body.linkedAccountId).toBe(a);

    const all = await request(app).get("/recurring-transactions");
    expect(all.body).toHaveLength(1);
    expect(all.body[0].accountId).toBe(b);
    expect(all.body[0].linkedAccountId).toBe(a);
    expect(all.body[0].amount).toBe(50000);
  });
});

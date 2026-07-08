import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { createSqliteAppHandle } from "../../testing/sqliteApp.js";

let app: Express;
let reset: () => Promise<void>;
let cleanup: () => Promise<void>;

const DEFAULT_CATEGORIES = [
  "Income",
  "Housing",
  "Food",
  "Subscriptions",
  "Entertainment",
  "Investment",
  "Transfer",
  "Miscellaneous",
];

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

async function createAccount() {
  const res = await request(app).post("/accounts").send({
    kind: "Girokonto",
    name: "Main",
    openingBalance: 100000,
    openingDate: "2026-01-01",
  });
  return res.body as { id: string };
}

// ---------------------------------------------------------------------------
// GET /categories
// ---------------------------------------------------------------------------

describe("GET /categories", () => {
  it("returns all default categories on a fresh startup", async () => {
    const res = await request(app).get("/categories");

    expect(res.status).toBe(200);

    const names = res.body.map((c: { name: string }) => c.name);
    for (const category of DEFAULT_CATEGORIES) {
      expect(names).toContain(category);
    }
  });

  it("includes custom categories alongside defaults", async () => {
    await request(app).post("/categories").send({ name: "Vet" });

    const res = await request(app).get("/categories");

    const names = res.body.map((c: { name: string }) => c.name);
    expect(names).toContain("Vet");
    expect(names).toContain("Food");
  });

  it("carries an authoritative hex color and a hidden boolean on every category", async () => {
    const res = await request(app).get("/categories");

    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    for (const cat of res.body as Array<{ color: unknown; hidden: unknown }>) {
      expect(typeof cat.color).toBe("string");
      expect(cat.color).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(typeof cat.hidden).toBe("boolean");
    }
  });

  it("marks seeded default categories as not hidden", async () => {
    const res = await request(app).get("/categories");

    const food = (res.body as Array<{ name: string; hidden: boolean }>).find(
      (c) => c.name === "Food"
    );
    expect(food?.hidden).toBe(false);
  });

  it("returns the same list regardless of which account is used", async () => {
    const accountA = await createAccount();
    const accountB = await request(app).post("/accounts").send({
      kind: "Tagesgeld",
      name: "Savings",
      openingBalance: 0,
      openingDate: "2026-01-01",
    });

    await request(app).post(`/accounts/${accountA.id}/transactions`).send({
      date: "2026-03-01",
      amount: -5000,
      description: "Food",
      category: "Food",
    });

    await request(app).post(`/accounts/${accountB.body.id}/transactions`).send({
      date: "2026-03-01",
      amount: -3000,
      description: "Rent",
      category: "Housing",
    });

    const res = await request(app).get("/categories");

    const names = res.body.map((c: { name: string }) => c.name);
    expect(names).toContain("Food");
    expect(names).toContain("Housing");
  });
});

// ---------------------------------------------------------------------------
// POST /categories
// ---------------------------------------------------------------------------

describe("POST /categories", () => {
  it("creates a custom category", async () => {
    const res = await request(app).post("/categories").send({ name: "Vet" });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe("Vet");
    expect(res.body.isDefault).toBe(false);
    expect(res.body.id).toBeDefined();
  });

  it("returns 400 when name is missing", async () => {
    const res = await request(app).post("/categories").send({});

    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// DELETE /categories/:id
// ---------------------------------------------------------------------------

describe("DELETE /categories/:id", () => {
  it("deletes a custom category with no transactions", async () => {
    const created = await request(app)
      .post("/categories")
      .send({ name: "Vet" });

    const res = await request(app).delete(`/categories/${created.body.id}`);

    expect(res.status).toBe(204);

    const list = await request(app).get("/categories");
    const names = list.body.map((c: { name: string }) => c.name);
    expect(names).not.toContain("Vet");
  });

  it("is blocked for a custom category that has transactions referencing it", async () => {
    const created = await request(app)
      .post("/categories")
      .send({ name: "Vet" });
    const account = await createAccount();

    await request(app).post(`/accounts/${account.id}/transactions`).send({
      date: "2026-03-01",
      amount: -6425,
      description: "Lassie",
      category: "Vet",
    });

    const res = await request(app).delete(`/categories/${created.body.id}`);

    expect(res.status).toBe(409);
  });

  it("is blocked for a default category regardless of transaction count", async () => {
    const list = await request(app).get("/categories");
    const food = list.body.find(
      (c: { name: string; isDefault: boolean }) => c.name === "Food"
    );

    const res = await request(app).delete(`/categories/${food.id}`);

    expect(res.status).toBe(409);
  });

  it("returns 404 for an unknown id", async () => {
    const res = await request(app).delete(
      "/categories/000000000000000000000000"
    );

    expect(res.status).toBe(404);
  });
});

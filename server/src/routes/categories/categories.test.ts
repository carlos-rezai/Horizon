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
// POST /categories  { name, color }  — add a Custom Category (issue #159)
// ---------------------------------------------------------------------------

describe("POST /categories { name, color }", () => {
  const CHOSEN_COLOR = "#6FBFBF";

  it("stores the chosen color and returns isDefault:false, hidden:false", async () => {
    const res = await request(app)
      .post("/categories")
      .send({ name: "Vet", color: CHOSEN_COLOR });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe("Vet");
    expect(res.body.color).toBe(CHOSEN_COLOR);
    expect(res.body.isDefault).toBe(false);
    expect(res.body.hidden).toBe(false);
  });

  it("returns 409 on a case-insensitive collision with an existing custom category", async () => {
    await request(app).post("/categories").send({ name: "Vet" });

    const res = await request(app)
      .post("/categories")
      .send({ name: "vet", color: CHOSEN_COLOR });

    expect(res.status).toBe(409);
  });

  it("returns 409 on a case-insensitive collision with a default category", async () => {
    const res = await request(app)
      .post("/categories")
      .send({ name: "food", color: CHOSEN_COLOR });

    expect(res.status).toBe(409);
  });

  it("returns 400 for a whitespace-only name", async () => {
    const res = await request(app)
      .post("/categories")
      .send({ name: "   ", color: CHOSEN_COLOR });

    expect(res.status).toBe(400);
  });

  it("does not create a second row when a collision is rejected", async () => {
    await request(app).post("/categories").send({ name: "food" });

    const list = await request(app).get("/categories");
    const foods = (list.body as Array<{ name: string }>).filter(
      (c) => c.name.toLowerCase() === "food"
    );
    expect(foods).toHaveLength(1);
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

// ---------------------------------------------------------------------------
// DELETE /categories/:id?reassignTo=<id>  — reassign-on-delete (issue #161)
// ---------------------------------------------------------------------------

describe("DELETE /categories/:id?reassignTo=<id>", () => {
  async function categoryByName(name: string): Promise<{ id: string }> {
    const list = await request(app).get("/categories");
    const found = (list.body as Array<{ id: string; name: string }>).find(
      (c) => c.name === name
    );
    if (!found) throw new Error(`category ${name} not found`);
    return found;
  }

  it("reassigns an in-use custom category's transactions to the target, then deletes it (204)", async () => {
    const created = await request(app)
      .post("/categories")
      .send({ name: "Vet" });
    const misc = await categoryByName("Miscellaneous");
    const account = await createAccount();

    await request(app).post(`/accounts/${account.id}/transactions`).send({
      date: "2026-03-01",
      amount: -6425,
      description: "Lassie",
      category: "Vet",
    });

    const res = await request(app).delete(
      `/categories/${created.body.id}?reassignTo=${misc.id}`
    );

    expect(res.status).toBe(204);

    const list = await request(app).get("/categories");
    const names = list.body.map((c: { name: string }) => c.name);
    expect(names).not.toContain("Vet");

    const txs = await request(app).get(`/accounts/${account.id}/transactions`);
    expect(
      (txs.body as Array<{ description: string; category: string }>).find(
        (t) => t.description === "Lassie"
      )?.category
    ).toBe("Miscellaneous");
  });

  it("returns 409 for an in-use custom category when no reassign target is supplied", async () => {
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

  it("returns 409 for a default category even with a reassign target", async () => {
    const food = await categoryByName("Food");
    const misc = await categoryByName("Miscellaneous");

    const res = await request(app).delete(
      `/categories/${food.id}?reassignTo=${misc.id}`
    );

    expect(res.status).toBe(409);
  });
});

// ---------------------------------------------------------------------------
// PATCH /categories/:id  { color }
// ---------------------------------------------------------------------------

describe("PATCH /categories/:id { color }", () => {
  const NEW_COLOR = "#6FBFBF";

  async function findCategory(name: string) {
    const list = await request(app).get("/categories");
    return (
      list.body as Array<{ id: string; name: string; color: string }>
    ).find((c) => c.name === name);
  }

  it("recolors a custom category and returns the updated category", async () => {
    const created = await request(app)
      .post("/categories")
      .send({ name: "Vet" });

    const res = await request(app)
      .patch(`/categories/${created.body.id}`)
      .send({ color: NEW_COLOR });

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(created.body.id);
    expect(res.body.name).toBe("Vet");
    expect(res.body.color).toBe(NEW_COLOR);
  });

  it("persists the new color so a follow-up GET reflects it", async () => {
    const created = await request(app)
      .post("/categories")
      .send({ name: "Vet" });

    await request(app)
      .patch(`/categories/${created.body.id}`)
      .send({ color: NEW_COLOR });

    const vet = await findCategory("Vet");
    expect(vet?.color).toBe(NEW_COLOR);
  });

  it("recolors a default category", async () => {
    const food = await findCategory("Food");

    const res = await request(app)
      .patch(`/categories/${food!.id}`)
      .send({ color: NEW_COLOR });

    expect(res.status).toBe(200);
    expect(res.body.color).toBe(NEW_COLOR);
  });

  it("returns 404 for an unknown id", async () => {
    const res = await request(app)
      .patch("/categories/000000000000000000000000")
      .send({ color: NEW_COLOR });

    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// PATCH /categories/:id  { name }  — rename a Custom Category (issue #160)
// ---------------------------------------------------------------------------

describe("PATCH /categories/:id { name }", () => {
  async function findCategory(name: string) {
    const list = await request(app).get("/categories");
    return (
      list.body as Array<{ id: string; name: string; isDefault: boolean }>
    ).find((c) => c.name === name);
  }

  it("renames a custom category and returns the updated category", async () => {
    const created = await request(app)
      .post("/categories")
      .send({ name: "Vet" });

    const res = await request(app)
      .patch(`/categories/${created.body.id}`)
      .send({ name: "Pets" });

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(created.body.id);
    expect(res.body.name).toBe("Pets");
  });

  it("cascades the new name to the category's transactions", async () => {
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

    await request(app)
      .patch(`/categories/${created.body.id}`)
      .send({ name: "Pets" });

    const txs = await request(app).get(`/accounts/${account.id}/transactions`);
    const categories = (txs.body as Array<{ category: string }>).map(
      (t) => t.category
    );
    expect(categories).toContain("Pets");
    expect(categories).not.toContain("Vet");
  });

  it("returns 409 on a case-insensitive collision", async () => {
    const created = await request(app)
      .post("/categories")
      .send({ name: "Vet" });
    await request(app).post("/categories").send({ name: "Pets" });

    const res = await request(app)
      .patch(`/categories/${created.body.id}`)
      .send({ name: "PETS" });

    expect(res.status).toBe(409);
    expect(typeof res.body.error).toBe("string");
  });

  it("returns 409 when renaming a default category", async () => {
    const food = await findCategory("Food");

    const res = await request(app)
      .patch(`/categories/${food!.id}`)
      .send({ name: "Groceries" });

    expect(res.status).toBe(409);
    expect(typeof res.body.error).toBe("string");
    expect(await findCategory("Food")).toBeDefined();
    expect(await findCategory("Groceries")).toBeUndefined();
  });

  it("returns 400 for a whitespace-only name", async () => {
    const created = await request(app)
      .post("/categories")
      .send({ name: "Vet" });

    const res = await request(app)
      .patch(`/categories/${created.body.id}`)
      .send({ name: "   " });

    expect(res.status).toBe(400);
  });

  it("returns 404 for an unknown id", async () => {
    const res = await request(app)
      .patch("/categories/000000000000000000000000")
      .send({ name: "Pets" });

    expect(res.status).toBe(404);
  });
});

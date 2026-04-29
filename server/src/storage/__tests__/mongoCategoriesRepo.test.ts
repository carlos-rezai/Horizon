import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import { createStorage } from "../index.js";
import type { Storage } from "../Storage.js";

let mongod: MongoMemoryServer;
let storage: Storage;

const DEFAULT_CATEGORY_NAMES = [
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
  mongod = await MongoMemoryServer.create();
  storage = await createStorage("mongo", { uri: mongod.getUri() });
});

afterAll(async () => {
  await storage.close();
  await mongod.stop();
});

afterEach(async () => {
  const { connection } = await import("mongoose");
  const collections = await connection.db?.collections();
  if (collections) {
    for (const collection of collections) {
      if (collection.collectionName === "categories") {
        await collection.deleteMany({ isDefault: false });
      } else {
        await collection.deleteMany({});
      }
    }
  }
});

// ---------------------------------------------------------------------------
// DTO shape
// ---------------------------------------------------------------------------

describe("CategoriesRepo DTO shape", () => {
  it("create returns a Category DTO with a string id and no Mongoose internals", async () => {
    const cat = await storage.categories.create({ name: "Vet" });

    expect(typeof cat.id).toBe("string");
    expect(cat.name).toBe("Vet");
    expect(cat.isDefault).toBe(false);

    const record = cat as unknown as Record<string, unknown>;
    expect(record._id).toBeUndefined();
    expect(record.__v).toBeUndefined();
    expect(record.toJSON).toBeUndefined();
  });

  it("findAll returns DTOs with string ids", async () => {
    const all = await storage.categories.findAll();

    expect(all.length).toBeGreaterThan(0);
    for (const cat of all) {
      expect(typeof cat.id).toBe("string");
      expect(typeof cat.name).toBe("string");
      expect(typeof cat.isDefault).toBe("boolean");
      const record = cat as unknown as Record<string, unknown>;
      expect(record._id).toBeUndefined();
    }
  });
});

// ---------------------------------------------------------------------------
// findAll
// ---------------------------------------------------------------------------

describe("CategoriesRepo.findAll", () => {
  it("includes the seeded default categories", async () => {
    const all = await storage.categories.findAll();
    const names = all.map((c) => c.name);

    for (const name of DEFAULT_CATEGORY_NAMES) {
      expect(names).toContain(name);
    }
  });

  it("includes custom categories alongside defaults", async () => {
    await storage.categories.create({ name: "Vet" });

    const all = await storage.categories.findAll();
    const names = all.map((c) => c.name);

    expect(names).toContain("Vet");
    expect(names).toContain("Food");
  });
});

// ---------------------------------------------------------------------------
// create
// ---------------------------------------------------------------------------

describe("CategoriesRepo.create", () => {
  it("creates a custom category with isDefault: false", async () => {
    const cat = await storage.categories.create({ name: "Vet" });

    expect(cat.name).toBe("Vet");
    expect(cat.isDefault).toBe(false);

    const all = await storage.categories.findAll();
    expect(all.find((c) => c.name === "Vet")?.isDefault).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// delete
// ---------------------------------------------------------------------------

describe("CategoriesRepo.delete", () => {
  it("returns { ok: true } and removes a custom category with no transactions", async () => {
    const created = await storage.categories.create({ name: "Vet" });

    const result = await storage.categories.delete(created.id);

    expect(result).toEqual({ ok: true });
    const all = await storage.categories.findAll();
    expect(all.find((c) => c.name === "Vet")).toBeUndefined();
  });

  it('returns { ok: false, reason: "is_default" } for a default category', async () => {
    const all = await storage.categories.findAll();
    const food = all.find((c) => c.name === "Food");
    expect(food).toBeDefined();

    const result = await storage.categories.delete(food!.id);

    expect(result).toEqual({ ok: false, reason: "is_default" });
    const stillThere = await storage.categories.findAll();
    expect(stillThere.find((c) => c.name === "Food")).toBeDefined();
  });

  it('returns { ok: false, reason: "in_use" } when a transaction references the category by name', async () => {
    const created = await storage.categories.create({ name: "Vet" });

    const account = await storage.accounts.create({
      kind: "Girokonto",
      name: "Main",
      openingBalance: 100000,
      openingDate: "2026-01-01",
    });

    await storage.transactions.create(account.id, {
      date: "2026-03-01",
      amount: -6425,
      description: "Lassie",
      category: "Vet",
    });

    const result = await storage.categories.delete(created.id);

    expect(result).toEqual({ ok: false, reason: "in_use" });
    const all = await storage.categories.findAll();
    expect(all.find((c) => c.name === "Vet")).toBeDefined();
  });

  it("returns null for an unparseable id", async () => {
    const result = await storage.categories.delete("not-an-id");
    expect(result).toBeNull();
  });

  it("returns null for an unknown but well-formed id", async () => {
    const result = await storage.categories.delete("000000000000000000000000");
    expect(result).toBeNull();
  });
});

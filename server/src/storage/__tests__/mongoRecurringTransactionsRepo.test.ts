import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import { createStorage } from "../index.js";
import type { Storage } from "../Storage.js";
import type { Account } from "../types.js";

let mongod: MongoMemoryServer;
let storage: Storage;

// Recreated per test by beforeEach so the recurring-create existence checks
// (added in the validates-references commit) always have a real account to
// target when the test does not care about the specific id.
let accountId: string;

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
      if (collection.collectionName === "categories") continue;
      await collection.deleteMany({});
    }
  }
});

beforeEach(async () => {
  const account = await storage.accounts.create({
    kind: "Girokonto",
    name: "Main",
    openingBalance: 100000,
    openingDate: "2026-01-01",
  });
  accountId = account.id;
});

async function makeAccount(
  overrides: Partial<{
    kind: Account["kind"];
    name: string;
    openingBalance: number;
    openingDate: string;
  }> = {}
): Promise<Account> {
  return storage.accounts.create({
    kind: "Girokonto",
    name: "Main",
    openingBalance: 100000,
    openingDate: "2026-01-01",
    ...overrides,
  });
}

// ---------------------------------------------------------------------------
// DTO shape
// ---------------------------------------------------------------------------

describe("RecurringTransactionsRepo DTO shape", () => {
  it("create returns a RecurringTransaction DTO with string id and accountId, no Mongoose internals", async () => {
    const r = await storage.recurringTransactions.create({
      accountId,
      amount: 95000,
      description: "Rent",
      category: "Housing",
      frequency: "monthly",
      dayOfMonth: 1,
    });

    expect(typeof r.id).toBe("string");
    expect(r.accountId).toBe(accountId);
    expect(r.amount).toBe(95000);
    expect(r.description).toBe("Rent");
    expect(r.category).toBe("Housing");
    expect(r.frequency).toBe("monthly");
    expect(r.dayOfMonth).toBe(1);
    expect(r.isActive).toBe(true);

    const record = r as unknown as Record<string, unknown>;
    expect(record._id).toBeUndefined();
    expect(record.__v).toBeUndefined();
    expect(record.toJSON).toBeUndefined();
  });

  it("findAll returns DTOs with string ids", async () => {
    await storage.recurringTransactions.create({
      accountId,
      amount: 95000,
      description: "Rent",
      category: "Housing",
      frequency: "monthly",
      dayOfMonth: 1,
    });

    const all = await storage.recurringTransactions.findAll();
    expect(all).toHaveLength(1);
    expect(typeof all[0].id).toBe("string");
    const record = all[0] as unknown as Record<string, unknown>;
    expect(record._id).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// create
// ---------------------------------------------------------------------------

describe("RecurringTransactionsRepo.create", () => {
  it("defaults isActive to true", async () => {
    const r = await storage.recurringTransactions.create({
      accountId,
      amount: 95000,
      description: "Rent",
      category: "Housing",
      frequency: "monthly",
      dayOfMonth: 1,
    });

    expect(r.isActive).toBe(true);
  });

  it("preserves linkedAccountId for a recurring transfer", async () => {
    const source = await makeAccount({ name: "Main", kind: "Girokonto" });
    const dest = await makeAccount({ name: "Savings", kind: "Tagesgeld" });

    const r = await storage.recurringTransactions.create({
      accountId: source.id,
      amount: 50000,
      description: "Monthly savings transfer",
      category: "Transfer",
      frequency: "monthly",
      dayOfMonth: 5,
      linkedAccountId: dest.id,
    });

    expect(r.linkedAccountId).toBe(dest.id);
  });

  it("preserves monthOfYear for an annual recurring transaction", async () => {
    const r = await storage.recurringTransactions.create({
      accountId,
      amount: 500000,
      description: "Sondertilgung",
      category: "Transfer",
      frequency: "annual",
      dayOfMonth: 1,
      monthOfYear: 10,
    });

    expect(r.monthOfYear).toBe(10);
    expect(r.frequency).toBe("annual");
  });

  it("does not set linkedAccountId or monthOfYear when not provided", async () => {
    const r = await storage.recurringTransactions.create({
      accountId,
      amount: 95000,
      description: "Rent",
      category: "Housing",
      frequency: "monthly",
      dayOfMonth: 1,
    });

    expect(r.linkedAccountId).toBeUndefined();
    expect(r.monthOfYear).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// findAll
// ---------------------------------------------------------------------------

describe("RecurringTransactionsRepo.findAll", () => {
  it("returns both active and inactive rows", async () => {
    const a = await storage.recurringTransactions.create({
      accountId,
      amount: 95000,
      description: "Rent",
      category: "Housing",
      frequency: "monthly",
      dayOfMonth: 1,
    });
    const b = await storage.recurringTransactions.create({
      accountId,
      amount: 20000,
      description: "Gym",
      category: "Subscriptions",
      frequency: "monthly",
      dayOfMonth: 10,
    });

    await storage.recurringTransactions.update(b.id, { isActive: false });

    const all = await storage.recurringTransactions.findAll();
    expect(all).toHaveLength(2);
    const ids = all.map((r) => r.id);
    expect(ids).toContain(a.id);
    expect(ids).toContain(b.id);
  });

  it("returns an empty array when no recurring transactions exist", async () => {
    const all = await storage.recurringTransactions.findAll();
    expect(all).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// findActive
// ---------------------------------------------------------------------------

describe("RecurringTransactionsRepo.findActive", () => {
  it("returns only rows with isActive: true", async () => {
    const active = await storage.recurringTransactions.create({
      accountId,
      amount: 95000,
      description: "Rent",
      category: "Housing",
      frequency: "monthly",
      dayOfMonth: 1,
    });
    const inactive = await storage.recurringTransactions.create({
      accountId,
      amount: 20000,
      description: "Gym",
      category: "Subscriptions",
      frequency: "monthly",
      dayOfMonth: 10,
    });

    await storage.recurringTransactions.update(inactive.id, {
      isActive: false,
    });

    const onlyActive = await storage.recurringTransactions.findActive();

    expect(onlyActive).toHaveLength(1);
    expect(onlyActive[0].id).toBe(active.id);
    expect(onlyActive.every((r) => r.isActive === true)).toBe(true);
  });

  it("returns an empty array when no active rows exist", async () => {
    const r = await storage.recurringTransactions.create({
      accountId,
      amount: 95000,
      description: "Rent",
      category: "Housing",
      frequency: "monthly",
      dayOfMonth: 1,
    });
    await storage.recurringTransactions.update(r.id, { isActive: false });

    const onlyActive = await storage.recurringTransactions.findActive();
    expect(onlyActive).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// update
// ---------------------------------------------------------------------------

describe("RecurringTransactionsRepo.update", () => {
  it("patches amount, description, and category", async () => {
    const r = await storage.recurringTransactions.create({
      accountId,
      amount: 95000,
      description: "Rent",
      category: "Housing",
      frequency: "monthly",
      dayOfMonth: 1,
    });

    const updated = await storage.recurringTransactions.update(r.id, {
      amount: 98000,
      description: "New rent",
      category: "Housing",
    });

    expect(updated?.amount).toBe(98000);
    expect(updated?.description).toBe("New rent");
    expect(updated?.id).toBe(r.id);
  });

  it("toggles isActive: true → false", async () => {
    const r = await storage.recurringTransactions.create({
      accountId,
      amount: 95000,
      description: "Rent",
      category: "Housing",
      frequency: "monthly",
      dayOfMonth: 1,
    });

    const updated = await storage.recurringTransactions.update(r.id, {
      isActive: false,
    });

    expect(updated?.isActive).toBe(false);
  });

  it("toggles isActive: false → true", async () => {
    const r = await storage.recurringTransactions.create({
      accountId,
      amount: 95000,
      description: "Rent",
      category: "Housing",
      frequency: "monthly",
      dayOfMonth: 1,
    });
    await storage.recurringTransactions.update(r.id, { isActive: false });

    const updated = await storage.recurringTransactions.update(r.id, {
      isActive: true,
    });

    expect(updated?.isActive).toBe(true);
  });

  it("returns null for an unparseable id", async () => {
    const result = await storage.recurringTransactions.update("not-an-id", {
      amount: 10000,
    });
    expect(result).toBeNull();
  });

  it("returns null for an unknown but well-formed id", async () => {
    const result = await storage.recurringTransactions.update(
      "000000000000000000000000",
      { amount: 10000 }
    );
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// delete
// ---------------------------------------------------------------------------

describe("RecurringTransactionsRepo.delete", () => {
  it("returns true and removes the row", async () => {
    const r = await storage.recurringTransactions.create({
      accountId,
      amount: 95000,
      description: "Rent",
      category: "Housing",
      frequency: "monthly",
      dayOfMonth: 1,
    });

    const result = await storage.recurringTransactions.delete(r.id);

    expect(result).toBe(true);
    const all = await storage.recurringTransactions.findAll();
    expect(all).toEqual([]);
  });

  it("returns false for an unparseable id", async () => {
    const result = await storage.recurringTransactions.delete("not-an-id");
    expect(result).toBe(false);
  });

  it("returns false for an unknown but well-formed id", async () => {
    const result = await storage.recurringTransactions.delete(
      "000000000000000000000000"
    );
    expect(result).toBe(false);
  });
});

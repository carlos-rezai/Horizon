import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import { createStorage } from "../index.js";
import type { Storage } from "../Storage.js";

let mongod: MongoMemoryServer;
let storage: Storage;

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
      await collection.deleteMany({});
    }
  }
});

// ---------------------------------------------------------------------------
// DTO shape
// ---------------------------------------------------------------------------

describe("AccountsRepo DTO shape", () => {
  it("create returns an Account DTO with a string id and no Mongoose internals", async () => {
    const account = await storage.accounts.create({
      kind: "Girokonto",
      name: "Main",
      openingBalance: 537685,
      openingDate: "2026-03-01",
    });

    expect(typeof account.id).toBe("string");
    expect(account.kind).toBe("Girokonto");
    expect(account.name).toBe("Main");
    expect(account.openingBalance).toBe(537685);
    expect(account.openingDate).toBe("2026-03-01");

    // No Mongoose internals leak through the boundary
    const accountRecord = account as unknown as Record<string, unknown>;
    expect(accountRecord._id).toBeUndefined();
    expect(accountRecord.__v).toBeUndefined();
    expect(accountRecord.toJSON).toBeUndefined();
  });

  it("findAll returns DTOs with string ids", async () => {
    await storage.accounts.create({
      kind: "Girokonto",
      name: "Main",
      openingBalance: 100000,
      openingDate: "2026-03-01",
    });

    const all = await storage.accounts.findAll();

    expect(all).toHaveLength(1);
    expect(typeof all[0].id).toBe("string");
    const record = all[0] as unknown as Record<string, unknown>;
    expect(record._id).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// findById
// ---------------------------------------------------------------------------

describe("AccountsRepo.findById", () => {
  it("returns the account by string id", async () => {
    const created = await storage.accounts.create({
      kind: "Tagesgeld",
      name: "DKB",
      openingBalance: 100300,
      openingDate: "2026-03-01",
    });

    const found = await storage.accounts.findById(created.id);

    expect(found).not.toBeNull();
    expect(found?.id).toBe(created.id);
    expect(found?.name).toBe("DKB");
  });

  it("returns null for an unknown but well-formed id", async () => {
    const found = await storage.accounts.findById("000000000000000000000000");
    expect(found).toBeNull();
  });

  it("returns null for an unparseable id (no throw, no query)", async () => {
    const found = await storage.accounts.findById("not-an-object-id");
    expect(found).toBeNull();
  });

  it("returns null for an operator-object payload coerced to string", async () => {
    const found = await storage.accounts.findById(
      String({ $ne: null } as unknown as string)
    );
    expect(found).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// update
// ---------------------------------------------------------------------------

describe("AccountsRepo.update", () => {
  it("updates the name and returns the updated DTO", async () => {
    const created = await storage.accounts.create({
      kind: "Girokonto",
      name: "Old",
      openingBalance: 100000,
      openingDate: "2026-03-01",
    });

    const updated = await storage.accounts.update(created.id, { name: "New" });

    expect(updated?.name).toBe("New");
    expect(updated?.id).toBe(created.id);
  });

  it("returns null for an unparseable id", async () => {
    const updated = await storage.accounts.update("not-an-id", { name: "X" });
    expect(updated).toBeNull();
  });

  it("returns null for an unknown but well-formed id", async () => {
    const updated = await storage.accounts.update("000000000000000000000000", {
      name: "X",
    });
    expect(updated).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// delete
// ---------------------------------------------------------------------------

describe("AccountsRepo.delete", () => {
  it("returns { ok: true } and removes the account when it has no transactions", async () => {
    const created = await storage.accounts.create({
      kind: "Investment",
      name: "MSCI",
      openingBalance: 0,
      openingDate: "2026-03-01",
    });

    const result = await storage.accounts.delete(created.id);

    expect(result).toEqual({ ok: true });
    expect(await storage.accounts.findById(created.id)).toBeNull();
  });

  it('returns { ok: false, reason: "has_transactions" } and does not remove the account when transactions exist', async () => {
    const created = await storage.accounts.create({
      kind: "Girokonto",
      name: "Main",
      openingBalance: 100000,
      openingDate: "2026-03-01",
    });

    // Insert a transaction directly via the underlying model — this slice
    // does not yet ship a transactions repo
    const { Transaction } = await import("../../models/Transaction.js");
    await Transaction.create({
      accountId: created.id,
      date: "2026-03-15",
      amount: -1000,
      description: "Coffee",
      category: "Food",
    });

    const result = await storage.accounts.delete(created.id);

    expect(result).toEqual({ ok: false, reason: "has_transactions" });
    expect(await storage.accounts.findById(created.id)).not.toBeNull();
  });

  it("returns null for an unparseable id", async () => {
    const result = await storage.accounts.delete("not-an-id");
    expect(result).toBeNull();
  });

  it("returns null for an unknown but well-formed id", async () => {
    const result = await storage.accounts.delete("000000000000000000000000");
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// findByIdWithBalance
// ---------------------------------------------------------------------------

describe("AccountsRepo.findByIdWithBalance", () => {
  it("returns AccountWithBalance for an existing account, balance = opening + sum(tx)", async () => {
    const created = await storage.accounts.create({
      kind: "Girokonto",
      name: "Main",
      openingBalance: 500000,
      openingDate: "2026-03-01",
    });

    const { Transaction } = await import("../../models/Transaction.js");
    await Transaction.create({
      accountId: created.id,
      date: "2026-03-15",
      amount: 100000,
      description: "Salary",
      category: "Salary",
    });
    await Transaction.create({
      accountId: created.id,
      date: "2026-03-20",
      amount: -50000,
      description: "Rent",
      category: "Housing",
    });

    const result = await storage.accounts.findByIdWithBalance(created.id);

    expect(result).not.toBeNull();
    expect(result?.id).toBe(created.id);
    expect(result?.balance).toBe(550000);
  });

  it("returns null for an unparseable id", async () => {
    const result = await storage.accounts.findByIdWithBalance("not-an-id");
    expect(result).toBeNull();
  });

  it("returns null for an unknown but well-formed id", async () => {
    const result = await storage.accounts.findByIdWithBalance(
      "000000000000000000000000"
    );
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// findAllWithBalance
// ---------------------------------------------------------------------------

describe("AccountsRepo.findAllWithBalance", () => {
  it("returns one entry per account with balance = opening + sum(tx)", async () => {
    const a = await storage.accounts.create({
      kind: "Girokonto",
      name: "Main",
      openingBalance: 500000,
      openingDate: "2026-03-01",
    });
    const b = await storage.accounts.create({
      kind: "Tagesgeld",
      name: "Reserve",
      openingBalance: 200000,
      openingDate: "2026-03-01",
    });

    const { Transaction } = await import("../../models/Transaction.js");
    await Transaction.create({
      accountId: a.id,
      date: "2026-03-15",
      amount: 100000,
      description: "Salary",
      category: "Salary",
    });
    await Transaction.create({
      accountId: b.id,
      date: "2026-03-15",
      amount: -50000,
      description: "Withdrawal",
      category: "Transfer",
    });

    const all = await storage.accounts.findAllWithBalance();
    const byId = new Map(all.map((acc) => [acc.id, acc]));

    expect(byId.get(a.id)?.balance).toBe(600000);
    expect(byId.get(b.id)?.balance).toBe(150000);
  });

  it("returns balance = openingBalance for an account with no transactions", async () => {
    const created = await storage.accounts.create({
      kind: "Girokonto",
      name: "Empty",
      openingBalance: 12345,
      openingDate: "2026-03-01",
    });

    const all = await storage.accounts.findAllWithBalance();

    expect(all).toHaveLength(1);
    expect(all[0].id).toBe(created.id);
    expect(all[0].balance).toBe(12345);
  });

  it("returns an empty array when no accounts exist", async () => {
    const all = await storage.accounts.findAllWithBalance();
    expect(all).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// getTotalLiquid
// ---------------------------------------------------------------------------

describe("AccountsRepo.getTotalLiquid", () => {
  it("sums Girokonto + Tagesgeld balances and excludes other kinds", async () => {
    const giro = await storage.accounts.create({
      kind: "Girokonto",
      name: "Main",
      openingBalance: 500000,
      openingDate: "2026-03-01",
    });
    const tg = await storage.accounts.create({
      kind: "Tagesgeld",
      name: "Reserve",
      openingBalance: 200000,
      openingDate: "2026-03-01",
    });
    await storage.accounts.create({
      kind: "Mortgage",
      name: "Darlehen",
      openingBalance: 4000000,
      openingDate: "2026-03-01",
    });
    await storage.accounts.create({
      kind: "Investment",
      name: "MSCI",
      openingBalance: 100000,
      openingDate: "2026-03-01",
    });
    await storage.accounts.create({
      kind: "CreditCard",
      name: "Visa",
      openingBalance: 0,
      openingDate: "2026-03-01",
    });

    const { Transaction } = await import("../../models/Transaction.js");
    await Transaction.create({
      accountId: giro.id,
      date: "2026-03-15",
      amount: 100000,
      description: "Salary",
      category: "Salary",
    });
    await Transaction.create({
      accountId: tg.id,
      date: "2026-03-15",
      amount: 50000,
      description: "Interest",
      category: "Interest",
    });

    const total = await storage.accounts.getTotalLiquid();

    expect(total).toBe(500000 + 100000 + 200000 + 50000);
  });

  it("returns 0 when no Girokonto or Tagesgeld accounts exist", async () => {
    await storage.accounts.create({
      kind: "Mortgage",
      name: "Darlehen",
      openingBalance: 4000000,
      openingDate: "2026-03-01",
    });

    const total = await storage.accounts.getTotalLiquid();
    expect(total).toBe(0);
  });

  it("returns 0 when no accounts exist", async () => {
    const total = await storage.accounts.getTotalLiquid();
    expect(total).toBe(0);
  });
});

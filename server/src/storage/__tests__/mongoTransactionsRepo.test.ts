import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { createStorage } from "../index.js";
import type { Storage } from "../Storage.js";
import type { Account } from "../types.js";

let mongod: MongoMemoryReplSet;
let storage: Storage;

beforeAll(async () => {
  mongod = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
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
// Helpers
// ---------------------------------------------------------------------------

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

describe("TransactionsRepo DTO shape", () => {
  it("create returns a Transaction DTO with string id and accountId, no Mongoose internals", async () => {
    const account = await makeAccount();

    const tx = await storage.transactions.create(account.id, {
      date: "2026-03-15",
      amount: -8500,
      description: "Supermarket",
      category: "Food",
    });

    expect(tx).not.toBeNull();
    expect(typeof tx?.id).toBe("string");
    expect(typeof tx?.accountId).toBe("string");
    expect(tx?.accountId).toBe(account.id);
    expect(tx?.date).toBe("2026-03-15");
    expect(tx?.amount).toBe(-8500);
    expect(tx?.description).toBe("Supermarket");
    expect(tx?.category).toBe("Food");

    const record = tx as unknown as Record<string, unknown>;
    expect(record._id).toBeUndefined();
    expect(record.__v).toBeUndefined();
    expect(record.toJSON).toBeUndefined();
  });

  it("findAll returns DTOs with string ids", async () => {
    const account = await makeAccount();
    await storage.transactions.create(account.id, {
      date: "2026-03-15",
      amount: -1000,
      description: "Coffee",
      category: "Food",
    });

    const all = await storage.transactions.findAll();

    expect(all).toHaveLength(1);
    expect(typeof all[0].id).toBe("string");
    const record = all[0] as unknown as Record<string, unknown>;
    expect(record._id).toBeUndefined();
  });

  it("findByAccount returns DTOs with string ids", async () => {
    const account = await makeAccount();
    await storage.transactions.create(account.id, {
      date: "2026-03-15",
      amount: -1000,
      description: "Coffee",
      category: "Food",
    });

    const list = await storage.transactions.findByAccount(account.id);

    expect(list).toHaveLength(1);
    expect(typeof list[0].id).toBe("string");
    const record = list[0] as unknown as Record<string, unknown>;
    expect(record._id).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// create
// ---------------------------------------------------------------------------

describe("TransactionsRepo.create", () => {
  it("returns null for an unparseable accountId (no throw, no query)", async () => {
    const result = await storage.transactions.create("not-an-id", {
      date: "2026-03-15",
      amount: -1000,
      description: "Coffee",
      category: "Food",
    });
    expect(result).toBeNull();
  });

  it("returns null for an unknown but well-formed accountId", async () => {
    const result = await storage.transactions.create(
      "000000000000000000000000",
      {
        date: "2026-03-15",
        amount: -1000,
        description: "Coffee",
        category: "Food",
      }
    );
    expect(result).toBeNull();
  });

  it("does not set transferId on a plain transaction", async () => {
    const account = await makeAccount();
    const tx = await storage.transactions.create(account.id, {
      date: "2026-03-15",
      amount: -1000,
      description: "Coffee",
      category: "Food",
    });
    expect(tx?.transferId).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// findAll
// ---------------------------------------------------------------------------

describe("TransactionsRepo.findAll", () => {
  it("returns transactions across all accounts", async () => {
    const a = await makeAccount({ name: "A" });
    const b = await makeAccount({ name: "B" });

    await storage.transactions.create(a.id, {
      date: "2026-03-01",
      amount: -100,
      description: "x",
      category: "Food",
    });
    await storage.transactions.create(b.id, {
      date: "2026-03-02",
      amount: -200,
      description: "y",
      category: "Food",
    });

    const all = await storage.transactions.findAll();
    expect(all).toHaveLength(2);
  });

  it("returns an empty array when no transactions exist", async () => {
    const all = await storage.transactions.findAll();
    expect(all).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// findByAccount
// ---------------------------------------------------------------------------

describe("TransactionsRepo.findByAccount", () => {
  it("returns only transactions for the given account", async () => {
    const a = await makeAccount({ name: "A" });
    const b = await makeAccount({ name: "B" });

    await storage.transactions.create(a.id, {
      date: "2026-03-01",
      amount: -100,
      description: "for-a",
      category: "Food",
    });
    await storage.transactions.create(b.id, {
      date: "2026-03-01",
      amount: -200,
      description: "for-b",
      category: "Food",
    });

    const aTxs = await storage.transactions.findByAccount(a.id);
    expect(aTxs).toHaveLength(1);
    expect(aTxs[0].description).toBe("for-a");
  });

  it("returns an empty array for an unparseable accountId", async () => {
    const list = await storage.transactions.findByAccount("not-an-id");
    expect(list).toEqual([]);
  });

  it("returns an empty array for an account with no transactions", async () => {
    const account = await makeAccount();
    const list = await storage.transactions.findByAccount(account.id);
    expect(list).toEqual([]);
  });

  it("filters by month when opts.month is provided", async () => {
    const account = await makeAccount();

    await storage.transactions.create(account.id, {
      date: "2026-02-28",
      amount: -100,
      description: "feb",
      category: "Food",
    });
    await storage.transactions.create(account.id, {
      date: "2026-03-01",
      amount: -200,
      description: "march-start",
      category: "Food",
    });
    await storage.transactions.create(account.id, {
      date: "2026-03-31",
      amount: -300,
      description: "march-end",
      category: "Food",
    });
    await storage.transactions.create(account.id, {
      date: "2026-04-01",
      amount: -400,
      description: "april",
      category: "Food",
    });

    const march = await storage.transactions.findByAccount(account.id, {
      month: "2026-03",
    });

    const descriptions = march.map((t) => t.description).sort();
    expect(descriptions).toEqual(["march-end", "march-start"]);
  });
});

// ---------------------------------------------------------------------------
// findByTransferId
// ---------------------------------------------------------------------------

describe("TransactionsRepo.findByTransferId", () => {
  it("returns both legs sharing a transferId", async () => {
    const source = await makeAccount({ name: "Source", kind: "Girokonto" });
    const dest = await makeAccount({ name: "Dest", kind: "Tagesgeld" });

    const created = await storage.transfers.create({
      fromAccountId: source.id,
      toAccountId: dest.id,
      amount: 70000,
      date: "2026-03-01",
      description: "Transfer",
      category: "Transfer",
    });

    expect(created).not.toBeNull();
    const legs = await storage.transactions.findByTransferId(
      created!.transferId
    );

    expect(legs).toHaveLength(2);
    expect(legs.every((l) => l.transferId === created!.transferId)).toBe(true);
  });

  it("returns an empty array when no transactions match the transferId", async () => {
    const legs = await storage.transactions.findByTransferId("nonexistent");
    expect(legs).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// update
// ---------------------------------------------------------------------------

describe("TransactionsRepo.update", () => {
  it("updates amount, description, category, and date", async () => {
    const account = await makeAccount();
    const tx = await storage.transactions.create(account.id, {
      date: "2026-03-15",
      amount: -8500,
      description: "Old",
      category: "Food",
    });

    const updated = await storage.transactions.update(tx!.id, {
      amount: -9000,
      description: "Updated",
      category: "Entertainment",
      date: "2026-03-16",
    });

    expect(updated?.amount).toBe(-9000);
    expect(updated?.description).toBe("Updated");
    expect(updated?.category).toBe("Entertainment");
    expect(updated?.date).toBe("2026-03-16");
    expect(updated?.id).toBe(tx!.id);
  });

  it("returns null for an unparseable id", async () => {
    const result = await storage.transactions.update("not-an-id", {
      description: "x",
    });
    expect(result).toBeNull();
  });

  it("returns null for an unknown but well-formed id", async () => {
    const result = await storage.transactions.update(
      "000000000000000000000000",
      { description: "x" }
    );
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// delete
// ---------------------------------------------------------------------------

describe("TransactionsRepo.delete", () => {
  it("returns { ok: true } and removes the transaction", async () => {
    const account = await makeAccount();
    const tx = await storage.transactions.create(account.id, {
      date: "2026-03-15",
      amount: -1000,
      description: "Coffee",
      category: "Food",
    });

    const result = await storage.transactions.delete(tx!.id);

    expect(result).toEqual({ ok: true });
    const remaining = await storage.transactions.findAll();
    expect(remaining).toHaveLength(0);
  });

  it('returns { ok: false, reason: "is_transfer_leg" } when the transaction has a transferId', async () => {
    const source = await makeAccount({ name: "Source", kind: "Girokonto" });
    const dest = await makeAccount({ name: "Dest", kind: "Tagesgeld" });

    const transfer = await storage.transfers.create({
      fromAccountId: source.id,
      toAccountId: dest.id,
      amount: 70000,
      date: "2026-03-01",
      description: "Transfer",
      category: "Transfer",
    });

    const legs = await storage.transactions.findByTransferId(
      transfer!.transferId
    );

    const result = await storage.transactions.delete(legs[0].id);

    expect(result).toEqual({ ok: false, reason: "is_transfer_leg" });

    // Both legs are still present
    const stillThere = await storage.transactions.findByTransferId(
      transfer!.transferId
    );
    expect(stillThere).toHaveLength(2);
  });

  it("returns null for an unparseable id", async () => {
    const result = await storage.transactions.delete("not-an-id");
    expect(result).toBeNull();
  });

  it("returns null for an unknown but well-formed id", async () => {
    const result = await storage.transactions.delete(
      "000000000000000000000000"
    );
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// accounts.delete guard reads from the new transactions repo
// ---------------------------------------------------------------------------

describe("accounts.delete + transactions repo integration", () => {
  it("blocks account deletion when transactions exist (created via the repo)", async () => {
    const account = await makeAccount();

    await storage.transactions.create(account.id, {
      date: "2026-03-15",
      amount: -1000,
      description: "Coffee",
      category: "Food",
    });

    const result = await storage.accounts.delete(account.id);

    expect(result).toEqual({ ok: false, reason: "has_transactions" });
    expect(await storage.accounts.findById(account.id)).not.toBeNull();
  });
});

import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";
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
  vi.restoreAllMocks();
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
  kind: Account["kind"],
  name: string,
  openingBalance: number
): Promise<Account> {
  return storage.accounts.create({
    kind,
    name,
    openingBalance,
    openingDate: "2026-01-01",
  });
}

// ---------------------------------------------------------------------------
// create
// ---------------------------------------------------------------------------

describe("TransfersRepo.create", () => {
  it("writes two linked legs sharing a string transferId", async () => {
    const source = await makeAccount("Girokonto", "Main", 500000);
    const dest = await makeAccount("Tagesgeld", "Savings", 0);

    const result = await storage.transfers.create({
      fromAccountId: source.id,
      toAccountId: dest.id,
      amount: 70000,
      date: "2026-03-01",
      description: "Sondertilgung reserve",
      category: "Transfer",
    });

    expect(result).not.toBeNull();
    expect(typeof result?.transferId).toBe("string");
    expect(result!.transferId.length).toBeGreaterThan(0);

    const legs = await storage.transactions.findByTransferId(
      result!.transferId
    );
    expect(legs).toHaveLength(2);
    expect(legs.every((l) => l.transferId === result!.transferId)).toBe(true);
  });

  it("creates a debit on the source and a credit on the destination", async () => {
    const source = await makeAccount("Girokonto", "Main", 500000);
    const dest = await makeAccount("Tagesgeld", "Savings", 0);

    const result = await storage.transfers.create({
      fromAccountId: source.id,
      toAccountId: dest.id,
      amount: 70000,
      date: "2026-03-01",
      description: "Transfer",
      category: "Transfer",
    });

    const sourceTxs = await storage.transactions.findByAccount(source.id);
    const destTxs = await storage.transactions.findByAccount(dest.id);

    expect(sourceTxs).toHaveLength(1);
    expect(destTxs).toHaveLength(1);
    expect(sourceTxs[0].amount).toBe(-70000);
    expect(destTxs[0].amount).toBe(70000);
    expect(sourceTxs[0].transferId).toBe(result!.transferId);
    expect(destTxs[0].transferId).toBe(result!.transferId);
  });

  it("returns null when fromAccountId is unparseable (no rows persist)", async () => {
    const dest = await makeAccount("Tagesgeld", "Savings", 0);

    const result = await storage.transfers.create({
      fromAccountId: "not-an-id",
      toAccountId: dest.id,
      amount: 70000,
      date: "2026-03-01",
      description: "Transfer",
      category: "Transfer",
    });

    expect(result).toBeNull();
    expect(await storage.transactions.findAll()).toEqual([]);
  });

  it("returns null when toAccountId is unparseable (no rows persist)", async () => {
    const source = await makeAccount("Girokonto", "Main", 500000);

    const result = await storage.transfers.create({
      fromAccountId: source.id,
      toAccountId: "not-an-id",
      amount: 70000,
      date: "2026-03-01",
      description: "Transfer",
      category: "Transfer",
    });

    expect(result).toBeNull();
    expect(await storage.transactions.findAll()).toEqual([]);
  });

  it("returns null when fromAccountId is well-formed but unknown", async () => {
    const dest = await makeAccount("Tagesgeld", "Savings", 0);

    const result = await storage.transfers.create({
      fromAccountId: "000000000000000000000000",
      toAccountId: dest.id,
      amount: 70000,
      date: "2026-03-01",
      description: "Transfer",
      category: "Transfer",
    });

    expect(result).toBeNull();
    expect(await storage.transactions.findAll()).toEqual([]);
  });

  it("returns null when toAccountId is well-formed but unknown", async () => {
    const source = await makeAccount("Girokonto", "Main", 500000);

    const result = await storage.transfers.create({
      fromAccountId: source.id,
      toAccountId: "000000000000000000000000",
      amount: 70000,
      date: "2026-03-01",
      description: "Transfer",
      category: "Transfer",
    });

    expect(result).toBeNull();
    expect(await storage.transactions.findAll()).toEqual([]);
  });

  it("is two-leg-or-nothing: a mid-create failure leaves zero rows, not one", async () => {
    const source = await makeAccount("Girokonto", "Main", 500000);
    const dest = await makeAccount("Tagesgeld", "Savings", 0);

    // Inject failure: spy on Transaction.create so the second insertion throws.
    // The transfers repo must use session.withTransaction() so the first leg
    // is rolled back when the second throws.
    const { Transaction } = await import("../../models/Transaction.js");
    const realCreate = Transaction.create.bind(Transaction);
    let callCount = 0;
    const spy = vi.spyOn(Transaction, "create").mockImplementation(((
      ...args: Parameters<typeof Transaction.create>
    ) => {
      callCount += 1;
      if (callCount === 2) {
        throw new Error("injected failure on second leg");
      }
      return realCreate(...args);
    }) as typeof Transaction.create);

    let threw = false;
    try {
      await storage.transfers.create({
        fromAccountId: source.id,
        toAccountId: dest.id,
        amount: 70000,
        date: "2026-03-01",
        description: "Transfer",
        category: "Transfer",
      });
    } catch {
      threw = true;
    }

    spy.mockRestore();

    // Either it returned null or threw — what matters is no orphan leg persists.
    expect([true, false]).toContain(threw);
    const all = await storage.transactions.findAll();
    expect(all).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// delete
// ---------------------------------------------------------------------------

describe("TransfersRepo.delete", () => {
  it("removes both legs and returns true", async () => {
    const source = await makeAccount("Girokonto", "Main", 500000);
    const dest = await makeAccount("Tagesgeld", "Savings", 0);

    const created = await storage.transfers.create({
      fromAccountId: source.id,
      toAccountId: dest.id,
      amount: 70000,
      date: "2026-03-01",
      description: "Transfer",
      category: "Transfer",
    });

    const result = await storage.transfers.delete(created!.transferId);

    expect(result).toBe(true);
    const legs = await storage.transactions.findByTransferId(
      created!.transferId
    );
    expect(legs).toHaveLength(0);
  });

  it("returns false for an unknown transferId", async () => {
    const result = await storage.transfers.delete("nonexistent-transfer-id");
    expect(result).toBe(false);
  });
});

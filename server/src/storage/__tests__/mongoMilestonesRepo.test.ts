import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import { createStorage } from "../index.js";
import type { Storage } from "../Storage.js";
import type { Account } from "../types.js";

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
      if (collection.collectionName === "categories") continue;
      await collection.deleteMany({});
    }
  }
});

async function makeAccount(): Promise<Account> {
  return storage.accounts.create({
    kind: "Tagesgeld",
    name: "Reserve",
    openingBalance: 500000,
    openingDate: "2026-01-01",
  });
}

// ---------------------------------------------------------------------------
// DTO shape
// ---------------------------------------------------------------------------

describe("MilestonesRepo DTO shape", () => {
  it("create returns a Milestone DTO with string id and accountId, no Mongoose internals", async () => {
    const account = await makeAccount();

    const milestone = await storage.milestones.create({
      name: "Emergency fund",
      accountId: account.id,
      targetBalance: 600000,
    });

    expect(milestone).not.toBeNull();
    expect(typeof milestone?.id).toBe("string");
    expect(typeof milestone?.accountId).toBe("string");
    expect(milestone?.accountId).toBe(account.id);
    expect(milestone?.name).toBe("Emergency fund");
    expect(milestone?.targetBalance).toBe(600000);

    const record = milestone as unknown as Record<string, unknown>;
    expect(record._id).toBeUndefined();
    expect(record.__v).toBeUndefined();
    expect(record.toJSON).toBeUndefined();
  });

  it("findAll returns DTOs with string ids", async () => {
    const account = await makeAccount();
    await storage.milestones.create({
      name: "Emergency fund",
      accountId: account.id,
      targetBalance: 600000,
    });

    const all = await storage.milestones.findAll();

    expect(all).toHaveLength(1);
    expect(typeof all[0].id).toBe("string");
    const record = all[0] as unknown as Record<string, unknown>;
    expect(record._id).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// findAll
// ---------------------------------------------------------------------------

describe("MilestonesRepo.findAll", () => {
  it("returns an empty array when no milestones exist", async () => {
    const all = await storage.milestones.findAll();
    expect(all).toEqual([]);
  });

  it("returns all milestones", async () => {
    const account = await makeAccount();

    await storage.milestones.create({
      name: "Emergency fund",
      accountId: account.id,
      targetBalance: 600000,
    });
    await storage.milestones.create({
      name: "House deposit",
      accountId: account.id,
      targetBalance: 2000000,
    });

    const all = await storage.milestones.findAll();
    expect(all).toHaveLength(2);
    const names = all.map((m) => m.name);
    expect(names).toContain("Emergency fund");
    expect(names).toContain("House deposit");
  });
});

// ---------------------------------------------------------------------------
// create
// ---------------------------------------------------------------------------

describe("MilestonesRepo.create", () => {
  it("returns the milestone DTO for a valid accountId", async () => {
    const account = await makeAccount();

    const milestone = await storage.milestones.create({
      name: "Emergency fund",
      accountId: account.id,
      targetBalance: 600000,
    });

    expect(milestone).not.toBeNull();
    expect(milestone?.accountId).toBe(account.id);
  });

  it("returns null for an unparseable accountId (no throw, no query)", async () => {
    const milestone = await storage.milestones.create({
      name: "Emergency fund",
      accountId: "not-an-id",
      targetBalance: 600000,
    });

    expect(milestone).toBeNull();
    const all = await storage.milestones.findAll();
    expect(all).toEqual([]);
  });

  it("returns null for a well-formed but unknown accountId", async () => {
    const milestone = await storage.milestones.create({
      name: "Emergency fund",
      accountId: "000000000000000000000000",
      targetBalance: 600000,
    });

    expect(milestone).toBeNull();
    const all = await storage.milestones.findAll();
    expect(all).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// delete
// ---------------------------------------------------------------------------

describe("MilestonesRepo.delete", () => {
  it("returns true and removes the milestone", async () => {
    const account = await makeAccount();
    const milestone = await storage.milestones.create({
      name: "Emergency fund",
      accountId: account.id,
      targetBalance: 600000,
    });

    const result = await storage.milestones.delete(milestone!.id);

    expect(result).toBe(true);
    const all = await storage.milestones.findAll();
    expect(all).toHaveLength(0);
  });

  it("returns false for an unparseable id", async () => {
    const result = await storage.milestones.delete("not-an-id");
    expect(result).toBe(false);
  });

  it("returns false for an unknown but well-formed id", async () => {
    const result = await storage.milestones.delete("000000000000000000000000");
    expect(result).toBe(false);
  });
});

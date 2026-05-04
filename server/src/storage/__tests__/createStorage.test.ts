import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import { createStorage } from "../index.js";
import type { Storage } from "../Storage.js";

let mongod: MongoMemoryServer;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
});

afterAll(async () => {
  await mongod.stop();
});

describe("createStorage", () => {
  it('returns a working Storage when called with "mongo"', async () => {
    const storage: Storage = await createStorage("mongo", {
      uri: mongod.getUri(),
    });

    expect(storage).toBeDefined();
    expect(storage.accounts).toBeDefined();
    expect(typeof storage.accounts.findAll).toBe("function");
    expect(typeof storage.close).toBe("function");

    await storage.close();
  });

  it('returns a working Storage when called with "sqlite"', async () => {
    const storage: Storage = await createStorage("sqlite", {
      path: ":memory:",
    });

    expect(storage).toBeDefined();
    expect(storage.accounts).toBeDefined();
    expect(typeof storage.accounts.findAll).toBe("function");
    expect(typeof storage.close).toBe("function");

    await storage.close();
  });

  it('throws a clear error when called with "sqlite" and no path option', async () => {
    await expect(createStorage("sqlite", {})).rejects.toThrow(
      "SQLite storage driver requires a 'path' option"
    );
  });

  it('throws a clear error when called with "sqlite" and no options at all', async () => {
    await expect(createStorage("sqlite")).rejects.toThrow(
      "SQLite storage driver requires a 'path' option"
    );
  });
});

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import { createApp } from "../../app.js";
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

describe("createApp(storage)", () => {
  it("exposes the same Storage instance via app.locals.storage", async () => {
    const app = await createApp(storage);
    expect(app.locals.storage).toBe(storage);
  });
});

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../app.js";
import { createStorage } from "./index.js";
import type { Storage } from "./Storage.js";

let storage: Storage;

beforeAll(async () => {
  storage = await createStorage({ path: ":memory:" });
});

afterAll(async () => {
  await storage.close();
});

describe("createApp(storage)", () => {
  it("exposes the same Storage instance via app.locals.storage", async () => {
    const app = await createApp(storage);
    expect(app.locals.storage).toBe(storage);
  });
});

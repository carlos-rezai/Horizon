import { describe, expect, it } from "vitest";
import { createStorage } from "../index.js";
import type { Storage } from "../Storage.js";

describe("createStorage", () => {
  it("returns a working Storage when called with a path", async () => {
    const storage: Storage = await createStorage({ path: ":memory:" });

    expect(storage).toBeDefined();
    expect(storage.accounts).toBeDefined();
    expect(typeof storage.accounts.findAll).toBe("function");
    expect(typeof storage.close).toBe("function");

    await storage.close();
  });
});

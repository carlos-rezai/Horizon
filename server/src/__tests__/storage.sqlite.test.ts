import { describe } from "vitest";
import { createStorage } from "../storage/index.js";
import type { Storage } from "../storage/Storage.js";
import { runStorageSpec } from "./storage.parity.js";

describe("SQLite Storage Driver — parity", () => {
  let storage: Storage;

  runStorageSpec(async () => {
    storage = await createStorage("sqlite", { path: ":memory:" });

    return {
      storage,
      reset: async () => {
        await storage.close();
        storage = await createStorage("sqlite", { path: ":memory:" });
      },
      cleanup: async () => {
        await storage.close();
      },
    };
  });
});

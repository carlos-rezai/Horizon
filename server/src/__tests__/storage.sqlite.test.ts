import { describe } from "vitest";
import { createStorage } from "../storage/index.js";
import type { Storage } from "../storage/Storage.js";
import { runStorageSpec } from "./storage.parity.js";

describe("SQLite Storage Driver — parity", () => {
  let inner: Storage;

  const wrapped: Storage = {
    get accounts() {
      return inner.accounts;
    },
    get transactions() {
      return inner.transactions;
    },
    get transfers() {
      return inner.transfers;
    },
    get categories() {
      return inner.categories;
    },
    get milestones() {
      return inner.milestones;
    },
    get recurringTransactions() {
      return inner.recurringTransactions;
    },
    close: () => inner.close(),
    backup: (destPath: string) => inner.backup(destPath),
    restore: (srcPath: string) => inner.restore(srcPath),
  };

  runStorageSpec("sqlite", async () => {
    inner = await createStorage("sqlite", { path: ":memory:" });

    return {
      storage: wrapped,
      reset: async () => {
        await inner.close();
        inner = await createStorage("sqlite", { path: ":memory:" });
      },
      cleanup: async () => {
        await inner.close();
      },
    };
  });
});

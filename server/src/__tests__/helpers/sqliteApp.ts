import type { Express } from "express";
import { createApp } from "../../app.js";
import { createStorage } from "../../storage/index.js";
import type { Storage } from "../../storage/Storage.js";

export interface SqliteAppHandle {
  app: Express;
  reset: () => Promise<void>;
  cleanup: () => Promise<void>;
}

export async function createSqliteAppHandle(): Promise<SqliteAppHandle> {
  let inner = await createStorage({ path: ":memory:" });

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
    status: () => inner.status(),
  };

  const app = await createApp(wrapped);

  return {
    app,
    reset: async () => {
      await inner.close();
      inner = await createStorage({ path: ":memory:" });
    },
    cleanup: async () => {
      await inner.close();
    },
  };
}

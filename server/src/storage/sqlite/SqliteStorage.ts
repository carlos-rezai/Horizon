import fs from "fs";
import Database from "better-sqlite3";
import type { Storage, StorageStatus } from "../Storage.js";
import {
  openConnection,
  closeConnection,
  type OpenConnectionOptions,
} from "./connection.js";
import { StorageIntegrityError } from "./errors.js";
import { createSqliteAccountsRepo } from "./accounts.js";
import { createSqliteCategoriesRepo } from "./categories.js";
import { createSqliteMilestonesRepo } from "./milestones.js";
import { createSqliteRecurringTransactionsRepo } from "./recurringTransactions.js";
import { createSqliteTransactionsRepo } from "./transactions.js";
import { createSqliteTransfersRepo } from "./transfers.js";

export type SqliteStorageOptions = OpenConnectionOptions;

interface Repos {
  accounts: ReturnType<typeof createSqliteAccountsRepo>;
  transactions: ReturnType<typeof createSqliteTransactionsRepo>;
  transfers: ReturnType<typeof createSqliteTransfersRepo>;
  categories: ReturnType<typeof createSqliteCategoriesRepo>;
  milestones: ReturnType<typeof createSqliteMilestonesRepo>;
  recurringTransactions: ReturnType<
    typeof createSqliteRecurringTransactionsRepo
  >;
}

function buildRepos(db: Database.Database): Repos {
  const transactions = createSqliteTransactionsRepo(db);
  const accounts = createSqliteAccountsRepo(db, transactions);
  const transfers = createSqliteTransfersRepo(db);
  const categories = createSqliteCategoriesRepo(db);
  const milestones = createSqliteMilestonesRepo(db);
  const recurringTransactions = createSqliteRecurringTransactionsRepo(db);
  return {
    accounts,
    transactions,
    transfers,
    categories,
    milestones,
    recurringTransactions,
  };
}

function validateRestoreSource(srcPath: string, maxUserVersion: number): void {
  let srcDb: Database.Database;
  try {
    srcDb = new Database(srcPath, { readonly: true, fileMustExist: true });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    throw new StorageIntegrityError(
      `SQLite restore source unusable: ${detail}`
    );
  }
  try {
    const rows = srcDb.pragma("integrity_check") as Array<{
      integrity_check: string;
    }>;
    const detail = rows.map((r) => r.integrity_check).join("\n");
    if (detail !== "ok") {
      throw new StorageIntegrityError(
        `SQLite integrity_check failed: ${detail}`
      );
    }
    const srcVersion = srcDb.pragma("user_version", {
      simple: true,
    }) as number;
    if (srcVersion > maxUserVersion) {
      throw new StorageIntegrityError(
        `SQLite restore source user_version ${srcVersion} is ahead of live schema ${maxUserVersion}. The source was written by a newer build of Horizon.`
      );
    }
  } catch (err) {
    srcDb.close();
    if (err instanceof StorageIntegrityError) throw err;
    const detail = err instanceof Error ? err.message : String(err);
    throw new StorageIntegrityError(`SQLite integrity_check failed: ${detail}`);
  }
  srcDb.close();
}

export async function createSqliteStorage(
  path: string,
  options?: SqliteStorageOptions
): Promise<Storage> {
  let db = openConnection(path, options);
  let repos = buildRepos(db);

  return {
    get accounts() {
      return repos.accounts;
    },
    get transactions() {
      return repos.transactions;
    },
    get transfers() {
      return repos.transfers;
    },
    get categories() {
      return repos.categories;
    },
    get milestones() {
      return repos.milestones;
    },
    get recurringTransactions() {
      return repos.recurringTransactions;
    },
    async close() {
      closeConnection(db);
    },
    async backup(destPath: string) {
      await db.backup(destPath);
    },
    async restore(srcPath: string) {
      const liveSchemaVersion = db.pragma("user_version", {
        simple: true,
      }) as number;
      validateRestoreSource(srcPath, liveSchemaVersion);

      closeConnection(db);
      fs.copyFileSync(srcPath, path);
      db = openConnection(path, options);
      repos = buildRepos(db);
    },
    async status(): Promise<StorageStatus> {
      const schemaVersion = db.pragma("user_version", {
        simple: true,
      }) as number;
      const rows = db.pragma("integrity_check") as Array<{
        integrity_check: string;
      }>;
      const integrity = rows.map((r) => r.integrity_check).join("\n");
      const sizeBytes = path === ":memory:" ? 0 : fs.statSync(path).size;
      return {
        driver: "sqlite",
        schemaVersion,
        integrity,
        path,
        sizeBytes,
      };
    },
  };
}

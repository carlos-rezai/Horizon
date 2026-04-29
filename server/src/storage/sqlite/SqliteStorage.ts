import Database from "better-sqlite3";
import type { Storage } from "../Storage.js";
import { migrate } from "./migrate.js";
import { createSqliteAccountsRepo } from "./accounts.js";
import { createSqliteCategoriesRepo } from "./categories.js";
import { createSqliteMilestonesRepo } from "./milestones.js";
import { createSqliteRecurringTransactionsRepo } from "./recurringTransactions.js";
import { createSqliteTransactionsRepo } from "./transactions.js";
import { createSqliteTransfersRepo } from "./transfers.js";

export async function createSqliteStorage(path: string): Promise<Storage> {
  const db = new Database(path);
  await migrate(db);

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
    async close() {
      db.close();
    },
  };
}

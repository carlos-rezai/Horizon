import type { Storage } from "../Storage.js";
import { openConnection, closeConnection } from "./connection.js";
import { createSqliteAccountsRepo } from "./accounts.js";
import { createSqliteCategoriesRepo } from "./categories.js";
import { createSqliteMilestonesRepo } from "./milestones.js";
import { createSqliteRecurringTransactionsRepo } from "./recurringTransactions.js";
import { createSqliteTransactionsRepo } from "./transactions.js";
import { createSqliteTransfersRepo } from "./transfers.js";

export async function createSqliteStorage(path: string): Promise<Storage> {
  const db = openConnection(path);

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
      closeConnection(db);
    },
  };
}

import mongoose from "mongoose";
import { seedCategories } from "../../models/Category.js";
import type { Storage } from "../Storage.js";
import { createMongoAccountsRepo } from "./accounts.js";
import { createMongoCategoriesRepo } from "./categories.js";
import { createMongoMilestonesRepo } from "./milestones.js";
import { createMongoRecurringTransactionsRepo } from "./recurringTransactions.js";
import { createMongoTransactionsRepo } from "./transactions.js";
import { createMongoTransfersRepo } from "./transfers.js";

export async function createMongoStorage(uri: string): Promise<Storage> {
  await mongoose.connect(uri);
  await seedCategories();

  const transactions = createMongoTransactionsRepo();
  const accounts = createMongoAccountsRepo(transactions);
  const transfers = createMongoTransfersRepo();
  const categories = createMongoCategoriesRepo();
  const milestones = createMongoMilestonesRepo();
  const recurringTransactions = createMongoRecurringTransactionsRepo();

  return {
    accounts,
    transactions,
    transfers,
    categories,
    milestones,
    recurringTransactions,
    async close() {
      await mongoose.disconnect();
    },
    async backup() {
      throw new Error("not supported");
    },
  };
}

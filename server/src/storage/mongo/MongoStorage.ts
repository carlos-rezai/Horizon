import mongoose from "mongoose";
import { seedCategories } from "../../models/Category.js";
import type { Storage } from "../Storage.js";
import { createMongoAccountsRepo } from "./accounts.js";
import { createMongoTransactionsRepo } from "./transactions.js";
import { createMongoTransfersRepo } from "./transfers.js";

export async function createMongoStorage(uri: string): Promise<Storage> {
  await mongoose.connect(uri);
  await seedCategories();

  const transactions = createMongoTransactionsRepo();
  const accounts = createMongoAccountsRepo(transactions);
  const transfers = createMongoTransfersRepo();

  return {
    accounts,
    transactions,
    transfers,
    async close() {
      await mongoose.disconnect();
    },
  };
}

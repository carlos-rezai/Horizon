import mongoose from "mongoose";
import { seedCategories } from "../../models/Category.js";
import type { Storage } from "../Storage.js";
import { createMongoAccountsRepo } from "./accounts.js";

export async function createMongoStorage(uri: string): Promise<Storage> {
  await mongoose.connect(uri);
  await seedCategories();

  return {
    accounts: createMongoAccountsRepo(),
    async close() {
      await mongoose.disconnect();
    },
  };
}

import express from "express";
import mongoose from "mongoose";
import accountsRouter from "./routes/accounts.js";
import transactionsRouter from "./routes/transactions.js";
import categoriesRouter from "./routes/categories.js";
import { seedCategories } from "./models/Category.js";

export async function createApp(mongoUri: string) {
  await mongoose.connect(mongoUri);
  await seedCategories();

  const app = express();
  app.use(express.json());
  app.use("/accounts", accountsRouter);
  app.use("/", transactionsRouter);
  app.use("/categories", categoriesRouter);

  return app;
}

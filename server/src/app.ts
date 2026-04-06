import express from "express";
import mongoose from "mongoose";
import accountsRouter from "./routes/accounts.js";
import transactionsRouter from "./routes/transactions.js";
import categoriesRouter from "./routes/categories.js";
import transfersRouter from "./routes/transfers.js";
import recurringTransactionsRouter from "./routes/recurringTransactions.js";
import projectionRouter from "./routes/projection.js";
import { seedCategories } from "./models/Category.js";

export async function createApp(mongoUri: string) {
  await mongoose.connect(mongoUri);
  await seedCategories();

  const app = express();
  app.use(express.json());
  app.use("/accounts", accountsRouter);
  app.use("/", transactionsRouter);
  app.use("/categories", categoriesRouter);
  app.use("/transfers", transfersRouter);
  app.use("/recurring-transactions", recurringTransactionsRouter);
  app.use("/projection", projectionRouter);

  return app;
}

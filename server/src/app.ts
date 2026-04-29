import express, { type Express } from "express";
import cors from "cors";
import accountsRouter from "./routes/accounts.js";
import transactionsRouter from "./routes/transactions.js";
import categoriesRouter from "./routes/categories.js";
import transfersRouter from "./routes/transfers.js";
import recurringTransactionsRouter from "./routes/recurringTransactions.js";
import projectionRouter from "./routes/projection.js";
import milestonesRouter from "./routes/milestones.js";
import { createStorage } from "./storage/index.js";
import type { Storage } from "./storage/Storage.js";

export async function createApp(storage: Storage): Promise<Express>;
export async function createApp(mongoUri: string): Promise<Express>;
export async function createApp(arg: Storage | string): Promise<Express> {
  const storage: Storage =
    typeof arg === "string" ? await createStorage("mongo", { uri: arg }) : arg;

  const app = express();
  app.locals.storage = storage;
  app.use(cors({ origin: process.env.CORS_ORIGIN ?? "http://localhost:5173" }));
  app.use(express.json());
  app.use("/accounts", accountsRouter);
  app.use("/", transactionsRouter);
  app.use("/categories", categoriesRouter);
  app.use("/transfers", transfersRouter);
  app.use("/recurring-transactions", recurringTransactionsRouter);
  app.use("/projection", projectionRouter);
  app.use("/milestones", milestonesRouter);

  return app;
}

import express, {
  type Express,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import cors from "cors";
import accountsRouter from "./routes/accounts.js";
import transactionsRouter from "./routes/transactions.js";
import categoriesRouter from "./routes/categories.js";
import transfersRouter from "./routes/transfers.js";
import recurringTransactionsRouter from "./routes/recurringTransactions.js";
import projectionRouter from "./routes/projection.js";
import storageRouter from "./routes/storage.js";
import type { Storage } from "./storage/Storage.js";

function logUnhandledError(
  err: unknown,
  _req: Request,
  res: Response,
  next: NextFunction
): void {
  console.error(err);
  if (res.headersSent) {
    next(err);
    return;
  }
  res.status(500).json({ error: "Internal server error" });
}

export function createApp(storage: Storage): Express {
  const app = express();
  app.locals.storage = storage;

  app.use(cors());
  app.use(express.json());

  app.use("/accounts", accountsRouter);
  app.use("/", transactionsRouter);
  app.use("/categories", categoriesRouter);
  app.use("/transfers", transfersRouter);
  app.use("/recurring-transactions", recurringTransactionsRouter);
  app.use("/projection", projectionRouter);
  app.use("/storage", storageRouter);

  app.use(logUnhandledError);

  return app;
}

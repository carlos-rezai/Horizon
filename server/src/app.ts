import express, {
  type Express,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import cors from "cors";
import accountsRouter from "./routes/accounts/accounts.js";
import transactionsRouter from "./routes/transactions/transactions.js";
import categoriesRouter from "./routes/categories/categories.js";
import transfersRouter from "./routes/transfers/transfers.js";
import recurringTransactionsRouter from "./routes/recurringTransactions/recurringTransactions.js";
import projectionRouter from "./routes/projection/projection.js";
import storageRouter from "./routes/storage/storage.js";
import settlementsRouter from "./routes/settlements/settlements.js";
import importsRouter from "./routes/imports/imports.js";
import reportsRouter from "./routes/reports/reports.js";
import { generateSettlements } from "./services/settlementService/settlementService.js";
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

export async function createApp(storage: Storage): Promise<Express> {
  await generateSettlements(storage);

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
  app.use("/settlements", settlementsRouter);
  app.use("/imports", importsRouter);
  app.use("/reports", reportsRouter);

  app.use(logUnhandledError);

  return app;
}

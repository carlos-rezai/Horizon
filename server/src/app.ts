import express, {
  type Express,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import accountsRouter from "./routes/accounts.js";
import transactionsRouter from "./routes/transactions.js";
import categoriesRouter from "./routes/categories.js";
import transfersRouter from "./routes/transfers.js";
import recurringTransactionsRouter from "./routes/recurringTransactions.js";
import projectionRouter from "./routes/projection.js";
import milestonesRouter from "./routes/milestones.js";
import storageStatusRouter from "./routes/storageStatus.js";
import storageBackupRouter from "./routes/storageBackup.js";
import { requireOwner } from "./auth/requireOwner.js";
import type { Storage } from "./storage/Storage.js";

const DEFAULT_AUTH_RATE_LIMIT_MAX = 60;
const DEFAULT_AUTH_RATE_LIMIT_WINDOW_MS = 60_000;

function sanitize5xx(_req: Request, res: Response, next: NextFunction): void {
  const original = res.end.bind(res);
  res.end = function patched(this: Response, ...args: unknown[]): Response {
    if (res.statusCode >= 500 && res.statusCode < 600) {
      const body = JSON.stringify({ error: "Internal server error" });
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.setHeader("Content-Length", Buffer.byteLength(body));
      return Reflect.apply(original, this, [body, "utf8"]) as Response;
    }
    return Reflect.apply(original, this, args) as Response;
  } as Response["end"];
  next();
}

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
  const app = express();
  app.locals.storage = storage;

  const authDisabled = process.env.AUTH_DISABLED === "1";

  app.use(cors({ origin: process.env.CORS_ORIGIN ?? "http://localhost:5173" }));
  app.use(express.json());

  if (!authDisabled) {
    app.use(helmet());
    app.use(sanitize5xx);

    const max = Number(
      process.env.AUTH_RATE_LIMIT_MAX ?? DEFAULT_AUTH_RATE_LIMIT_MAX
    );
    const windowMs = Number(
      process.env.AUTH_RATE_LIMIT_WINDOW_MS ?? DEFAULT_AUTH_RATE_LIMIT_WINDOW_MS
    );
    app.use(
      rateLimit({
        max,
        windowMs,
        standardHeaders: false,
        legacyHeaders: false,
        validate: false,
      })
    );

    app.use(requireOwner);
  }

  app.use("/accounts", accountsRouter);
  app.use("/", transactionsRouter);
  app.use("/categories", categoriesRouter);
  app.use("/transfers", transfersRouter);
  app.use("/recurring-transactions", recurringTransactionsRouter);
  app.use("/projection", projectionRouter);
  app.use("/milestones", milestonesRouter);
  app.use("/storage", storageStatusRouter);
  app.use("/storage", storageBackupRouter);

  if (!authDisabled) {
    app.use(logUnhandledError);
  }

  return app;
}

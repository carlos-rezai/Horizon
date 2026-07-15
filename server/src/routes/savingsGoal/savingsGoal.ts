import { Router, type Request } from "express";
import type { Storage } from "../../storage/Storage.js";
import type { SavingsGoalConfig } from "../../storage/types.js";

const router = Router();

function getStorage(req: Request): Storage {
  return req.app.locals.storage;
}

/** The current month as "YYYY-MM". */
function currentYearMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * The config the card renders before the user has ever saved a goal: Manual
 * mode with no per-account targets, anchored on the current month. Every
 * account reads as "not tracked" and the streak is 0 — an honest empty state.
 */
function defaultConfig(): SavingsGoalConfig {
  const month = currentYearMonth();
  return {
    mode: "manual",
    targetTotal: 0,
    targetDate: month,
    startedAt: month,
    manualMonthly: {},
  };
}

router.get("/", async (req, res) => {
  const stored = await getStorage(req).savingsGoal.get();
  res.json(stored ?? defaultConfig());
});

/**
 * A well-formed goal config from an untrusted body: `mode` is one of the two
 * known modes, the monetary/date fields are the right primitive types, and
 * every `manualMonthly` value is a finite number. `startedAt` is intentionally
 * not validated here — the route owns it and overwrites whatever the client
 * sent (see the PUT handler).
 */
function isValidGoalBody(body: unknown): body is SavingsGoalConfig {
  if (typeof body !== "object" || body === null) return false;
  const candidate = body as Record<string, unknown>;
  if (candidate.mode !== "manual" && candidate.mode !== "milestone") {
    return false;
  }
  if (typeof candidate.targetTotal !== "number") return false;
  if (typeof candidate.targetDate !== "string") return false;
  const monthly = candidate.manualMonthly;
  if (typeof monthly !== "object" || monthly === null) return false;
  return Object.values(monthly as Record<string, unknown>).every(
    (value) => typeof value === "number" && Number.isFinite(value)
  );
}

router.put("/", async (req, res) => {
  if (!isValidGoalBody(req.body)) {
    res.status(400).json({ error: "Invalid savings goal config" });
    return;
  }

  const storage = getStorage(req);
  const existing = await storage.savingsGoal.get();
  // `startedAt` is server-owned: stamped to the current month on the first-ever
  // save and fixed forever after, so a client can never move the point from
  // which cumulative progress is measured.
  const startedAt = existing?.startedAt ?? currentYearMonth();

  await storage.savingsGoal.upsert({ ...req.body, startedAt });
  res.json({ ...req.body, startedAt });
});

export default router;

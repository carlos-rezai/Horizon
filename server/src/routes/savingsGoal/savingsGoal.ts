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

export default router;

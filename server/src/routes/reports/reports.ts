import { Router, type Request } from "express";
import { z } from "zod";
import { computeYearComparison } from "../../lib/yearComparison/yearComparison.js";
import { deriveMonthCashFlow } from "../../lib/monthCashFlow/monthCashFlow.js";
import {
  projectMonths,
  toProjectionAccountEntry,
  toProjectionRecurringEntry,
  toProjectionTxEntry,
} from "../../lib/projection/projection.js";
import { historySpanStart } from "../../lib/historySpan/historySpan.js";
import {
  currentMonth,
  monthsBetween,
  parseYearMonth,
} from "../../lib/date/date.js";
import type { Storage } from "../../storage/Storage.js";

const router = Router();

function getStorage(req: Request): Storage {
  return req.app.locals.storage;
}

router.get("/year-comparison", async (req, res) => {
  const storage = getStorage(req);
  const { month } = req.query;

  if (typeof month !== "string" || !/^\d{4}-\d{2}$/.test(month)) {
    res.status(400).json({ error: "month must match YYYY-MM" });
    return;
  }

  // The library only compares Jan 1 of the prior year through the viewed month,
  // so fetch exactly that two-year span instead of the whole table. The lower
  // bound is January 1 of the prior year; the upper bound (exclusive) is the
  // first day of the month after the viewed month.
  const { year: viewedYear, month: viewedMonth } = parseYearMonth(month);
  const fromInclusive = `${viewedYear - 1}-01-01`;
  const upperYear = viewedMonth === 12 ? viewedYear + 1 : viewedYear;
  const upperMonth = viewedMonth === 12 ? 1 : viewedMonth + 1;
  const toExclusive = `${upperYear}-${String(upperMonth).padStart(2, "0")}-01`;

  // The storage Account and Transaction DTOs are structural supersets of the
  // library's YcAccountEntry / YcTxEntry inputs, so they pass straight through.
  // The library still re-applies its own window/year filters, so the narrowed
  // fetch cannot change the rows.
  const [accounts, transactions] = await Promise.all([
    storage.accounts.findAll(),
    storage.transactions.findByDateRange(fromInclusive, toExclusive),
  ]);

  const rows = computeYearComparison(transactions, accounts, month);

  res.json({ month, rows });
});

const MonthQuerySchema = z.object({
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "month must be YYYY-MM"),
});

router.get("/month-cash-flow", async (req, res) => {
  const parsed = MonthQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ issues: parsed.error.issues });
    return;
  }
  const { month } = parsed.data;

  const storage = getStorage(req);
  const [accounts, transactions, recurrings] = await Promise.all([
    storage.accounts.findAll(),
    storage.transactions.findAll(),
    storage.recurringTransactions.findActive(),
  ]);

  // A current or future month runs forward from the current month, as
  // /projection does; an earlier month runs from the History Span's start, as
  // /projection/history does. A month before the span is not covered.
  const current = currentMonth();
  const from =
    month >= current
      ? current
      : historySpanStart(accounts, transactions, current);
  const covered = month >= from;

  const projected = covered
    ? projectMonths(
        accounts.map(toProjectionAccountEntry),
        transactions.map(toProjectionTxEntry),
        recurrings.map(toProjectionRecurringEntry),
        from,
        current,
        monthsBetween(from, month) + 1
      )
    : [];

  res.json(deriveMonthCashFlow(month, projected, accounts, recurrings));
});

export default router;

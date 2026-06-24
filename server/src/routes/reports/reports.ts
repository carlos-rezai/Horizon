import { Router, type Request } from "express";
import { computeYearComparison } from "../../lib/yearComparison/yearComparison.js";
import { parseYearMonth } from "../../lib/date/date.js";
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

export default router;

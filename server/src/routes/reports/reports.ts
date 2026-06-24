import { Router, type Request } from "express";
import { computeYearComparison } from "../../lib/yearComparison/yearComparison.js";
import type { Storage } from "../../storage/Storage.js";

const router = Router();

function getStorage(req: Request): Storage {
  return req.app.locals.storage;
}

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

router.get("/year-comparison", async (req, res) => {
  const storage = getStorage(req);
  const month =
    typeof req.query.month === "string" && /^\d{4}-\d{2}$/.test(req.query.month)
      ? req.query.month
      : currentMonth();

  const [accounts, transactions] = await Promise.all([
    storage.accounts.findAll(),
    storage.transactions.findAll(),
  ]);

  const accountEntries = accounts.map((a) => ({ id: a.id, kind: a.kind }));
  const transactionEntries = transactions.map((tx) => ({
    accountId: tx.accountId,
    date: tx.date,
    amount: tx.amount,
    category: tx.category,
    transferId: tx.transferId,
    isAutoSettlement: tx.isAutoSettlement,
  }));

  const rows = computeYearComparison(transactionEntries, accountEntries, month);

  res.json({ month, rows });
});

export default router;

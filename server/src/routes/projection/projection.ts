import { Router, type Request } from "express";
import {
  projectBalances,
  toProjectionAccountEntry,
} from "../../lib/projection/projection.js";
import { deriveHistory } from "../../lib/projection/history.js";
import { historySpanStart } from "../../lib/historySpan/historySpan.js";
import type { Storage } from "../../storage/Storage.js";

const router = Router();

function getStorage(req: Request): Storage {
  return req.app.locals.storage;
}

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function monthsBetween(from: string, to: string): number {
  const [fy, fm] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  return (ty - fy) * 12 + (tm - fm);
}

router.get("/", async (req, res) => {
  const storage = getStorage(req);
  const [accounts, transactions, recurringTransactions] = await Promise.all([
    storage.accounts.findAll(),
    storage.transactions.findAll(),
    storage.recurringTransactions.findActive(),
  ]);

  const accountEntries = accounts.map(toProjectionAccountEntry);

  const transactionEntries = transactions.map((tx) => ({
    accountId: tx.accountId,
    date: tx.date,
    amount: tx.amount,
  }));

  const recurringEntries = recurringTransactions.map((r) => ({
    accountId: r.accountId,
    amount: r.amount,
    frequency: r.frequency,
    dayOfMonth: r.dayOfMonth,
    ...(r.linkedAccountId !== undefined && {
      linkedAccountId: r.linkedAccountId,
    }),
    ...(r.monthOfYear !== undefined && { monthOfYear: r.monthOfYear }),
  }));

  const from = currentMonth();
  const monthsParam = req.query.months;
  const months =
    typeof monthsParam === "string" && /^\d+$/.test(monthsParam)
      ? parseInt(monthsParam, 10)
      : 240;
  const snapshots = projectBalances(
    accountEntries,
    transactionEntries,
    recurringEntries,
    from,
    from,
    months
  );

  res.json(snapshots);
});

router.get("/history", async (req, res) => {
  const storage = getStorage(req);
  const [accounts, transactions, recurringTransactions] = await Promise.all([
    storage.accounts.findAll(),
    storage.transactions.findAll(),
    storage.recurringTransactions.findActive(),
  ]);

  // The History Span: the earliest Known Since across all accounts through the
  // current month. A span holding only the current month has no history.
  const current = currentMonth();
  const from = historySpanStart(accounts, transactions, current);
  if (from >= current) {
    res.json([]);
    return;
  }

  const months = monthsBetween(from, current) + 1;

  const accountEntries = accounts.map(toProjectionAccountEntry);

  const transactionEntries = transactions.map((tx) => ({
    accountId: tx.accountId,
    date: tx.date,
    amount: tx.amount,
  }));

  const recurringEntries = recurringTransactions.map((r) => ({
    accountId: r.accountId,
    amount: r.amount,
    frequency: r.frequency,
    dayOfMonth: r.dayOfMonth,
    ...(r.linkedAccountId !== undefined && {
      linkedAccountId: r.linkedAccountId,
    }),
    ...(r.monthOfYear !== undefined && { monthOfYear: r.monthOfYear }),
  }));

  const snapshots = projectBalances(
    accountEntries,
    transactionEntries,
    recurringEntries,
    from,
    current,
    months
  );

  const points = deriveHistory(snapshots, transactionEntries, accountEntries);

  res.json(points);
});

export default router;

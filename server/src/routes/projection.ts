import { Router } from "express";
import { Account } from "../models/Account.js";
import { Transaction } from "../models/Transaction.js";
import { RecurringTransaction } from "../models/RecurringTransaction.js";
import { projectBalances } from "../lib/projection.js";

const router = Router();

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

router.get("/", async (req, res) => {
  const [accounts, transactions, recurringTransactions] = await Promise.all([
    Account.find(),
    Transaction.find(),
    RecurringTransaction.find({ isActive: true }),
  ]);

  const accountEntries = accounts.map((a) => ({
    _id: String(a._id),
    kind: a.kind,
    openingBalance: a.openingBalance,
    openingDate: a.openingDate,
  }));

  const transactionEntries = transactions.map((tx) => ({
    accountId: String(tx.accountId),
    date: tx.date,
    amount: tx.amount,
  }));

  const recurringEntries = recurringTransactions.map((r) => ({
    accountId: r.accountId,
    amount: r.amount,
    frequency: r.frequency,
    dayOfMonth: r.dayOfMonth,
    isActive: r.isActive,
    ...(r.linkedAccountId != null && { linkedAccountId: r.linkedAccountId }),
    ...(r.monthOfYear != null && { monthOfYear: r.monthOfYear }),
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

export default router;

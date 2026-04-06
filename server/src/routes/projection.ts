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

router.get("/", async (_req, res) => {
  const [accounts, transactions, recurringTransactions] = await Promise.all([
    Account.find(),
    Transaction.find(),
    RecurringTransaction.find({ isActive: true }),
  ]);

  const accountEntries = accounts.map((a) => ({
    _id: String(a._id),
    kind: a.kind,
    openingBalance: a.openingBalance,
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
  }));

  const from = currentMonth();
  const snapshots = projectBalances(
    accountEntries,
    transactionEntries,
    recurringEntries,
    from,
    from
  );

  res.json(snapshots);
});

export default router;

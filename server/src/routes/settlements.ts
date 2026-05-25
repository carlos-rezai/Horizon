import { Router, type Request } from "express";
import type { Storage } from "../storage/Storage.js";
import { generateSettlements } from "../services/settlementService.js";
import {
  detectInsufficientFunds,
  type InsufficientFundsWarning,
} from "../lib/settlement/settlement.js";
import { projectBalances } from "../lib/projection/projection.js";

const router = Router();

function getStorage(req: Request): Storage {
  return req.app.locals.storage;
}

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

router.post("/generate", async (req, res) => {
  const count = await generateSettlements(getStorage(req));
  res.json({ count });
});

router.get("/warnings", async (req, res) => {
  const storage = getStorage(req);
  const [accounts, transactions, recurringTransactions] = await Promise.all([
    storage.accounts.findAll(),
    storage.transactions.findAll(),
    storage.recurringTransactions.findActive(),
  ]);

  const accountEntries = accounts.map((a) => ({
    id: a.id,
    kind: a.kind,
    openingBalance: a.openingBalance,
    openingDate: a.openingDate,
    ...(a.linkedAccountId != null && { linkedAccountId: a.linkedAccountId }),
    ...(a.settlementDay != null && { settlementDay: a.settlementDay }),
    ...(a.linkedSince != null && { linkedSince: a.linkedSince }),
  }));

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
  const projection = projectBalances(
    accountEntries,
    transactionEntries,
    recurringEntries,
    from,
    from
  );

  const warnings: InsufficientFundsWarning[] = detectInsufficientFunds(
    accounts,
    projection
  );
  res.json(warnings);
});

export default router;

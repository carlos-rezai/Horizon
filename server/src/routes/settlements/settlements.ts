import { Router, type Request } from "express";
import type { Storage } from "../../storage/Storage.js";
import { generateSettlements } from "../../services/settlementService/settlementService.js";
import {
  detectInsufficientFunds,
  type InsufficientFundsWarning,
} from "../../lib/settlement/settlement.js";
import {
  projectBalances,
  toProjectionAccountEntry,
  toProjectionRecurringEntry,
  toProjectionTxEntry,
} from "../../lib/projection/projection.js";
import { currentMonth } from "../../lib/date/date.js";

const router = Router();

function getStorage(req: Request): Storage {
  return req.app.locals.storage;
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

  const accountEntries = accounts.map(toProjectionAccountEntry);

  const transactionEntries = transactions.map(toProjectionTxEntry);

  const recurringEntries = recurringTransactions.map(
    toProjectionRecurringEntry
  );

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

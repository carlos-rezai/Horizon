import { Router, type Request } from "express";
import { computeYearComparison } from "../../lib/yearComparison/yearComparison.js";
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

  // The storage Account and Transaction DTOs are structural supersets of the
  // library's YcAccountEntry / YcTxEntry inputs, so they pass straight through.
  const [accounts, transactions] = await Promise.all([
    storage.accounts.findAll(),
    storage.transactions.findAll(),
  ]);

  const rows = computeYearComparison(transactions, accounts, month);

  res.json({ month, rows });
});

export default router;

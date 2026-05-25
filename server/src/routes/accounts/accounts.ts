import { Router, type Request } from "express";
import {
  AccountCreateSchema,
  AccountUpdateSchema,
} from "../../schemas/account.js";
import {
  calcNetCashflow,
  calcFreeCashflow,
} from "../../lib/cashflow/cashflow.js";
import type { Storage } from "../../storage/Storage.js";

const router = Router();

function getStorage(req: Request): Storage {
  return req.app.locals.storage;
}

router.post("/", async (req, res) => {
  const parsed = AccountCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ issues: parsed.error.issues });
    return;
  }
  const account = await getStorage(req).accounts.create(parsed.data);
  res.status(201).json(account);
});

router.get("/", async (req, res) => {
  const accounts = await getStorage(req).accounts.findAllWithBalance();
  res.json(accounts);
});

router.get("/liquid", async (req, res) => {
  const totalLiquid = await getStorage(req).accounts.getTotalLiquid();
  res.json({ totalLiquid });
});

router.get("/:id/cashflow", async (req, res) => {
  const storage = getStorage(req);
  const account = await storage.accounts.findById(req.params.id);
  if (!account) {
    res.status(404).json({ error: "Account not found" });
    return;
  }

  const { month } = req.query;
  const allTxs = await storage.transactions.findByAccount(
    account.id,
    typeof month === "string" ? { month } : undefined
  );
  const txs = allTxs.map((tx) => ({
    amount: tx.amount,
    accountId: tx.accountId,
    transferId: tx.transferId,
  }));

  res.json({
    netCashflow: calcNetCashflow(txs),
    freeCashflow: calcFreeCashflow(txs, account.id),
  });
});

router.get("/:id", async (req, res) => {
  const account = await getStorage(req).accounts.findByIdWithBalance(
    req.params.id
  );
  if (!account) {
    res.status(404).json({ error: "Account not found" });
    return;
  }
  res.json(account);
});

router.patch("/:id", async (req, res) => {
  const parsed = AccountUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ issues: parsed.error.issues });
    return;
  }

  const updated = await getStorage(req).accounts.update(
    req.params.id,
    parsed.data
  );
  if (!updated) {
    res.status(404).json({ error: "Account not found" });
    return;
  }

  const withBalance = await getStorage(req).accounts.findByIdWithBalance(
    updated.id
  );
  res.json(withBalance ?? updated);
});

router.delete("/:id", async (req, res) => {
  const result = await getStorage(req).accounts.delete(req.params.id);
  if (result === null) {
    res.status(404).json({ error: "Account not found" });
    return;
  }
  if (!result.ok) {
    if (result.reason === "in_use") {
      res.status(409).json({
        error: "Cannot delete account referenced by a recurring transaction",
      });
      return;
    }
    res.status(409).json({ error: "Cannot delete account with transactions" });
    return;
  }
  res.status(204).send();
});

export default router;

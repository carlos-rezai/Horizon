import { Router, type Request } from "express";
import {
  TransactionCreateSchema,
  TransactionUpdateSchema,
} from "../schemas/transaction.js";
import type { Storage } from "../storage/Storage.js";

const router = Router();

function getStorage(req: Request): Storage {
  return req.app.locals.storage;
}

router.post("/accounts/:id/transactions", async (req, res) => {
  const parsed = TransactionCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ issues: parsed.error.issues });
    return;
  }

  const created = await getStorage(req).transactions.create(
    req.params.id,
    parsed.data
  );
  if (!created) {
    res.status(404).json({ error: "Account not found" });
    return;
  }

  res.status(201).json(created);
});

router.get("/accounts/:id/transactions", async (req, res) => {
  const account = await getStorage(req).accounts.findById(req.params.id);
  if (!account) {
    res.status(404).json({ error: "Account not found" });
    return;
  }

  const txs = await getStorage(req).transactions.findByAccount(req.params.id);
  res.json(txs);
});

router.patch("/transactions/:id", async (req, res) => {
  const parsed = TransactionUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ issues: parsed.error.issues });
    return;
  }

  const updated = await getStorage(req).transactions.update(
    req.params.id,
    parsed.data
  );
  if (!updated) {
    res.status(404).json({ error: "Transaction not found" });
    return;
  }

  res.json(updated);
});

router.delete("/transactions/:id", async (req, res) => {
  const result = await getStorage(req).transactions.delete(req.params.id);
  if (result === null) {
    res.status(404).json({ error: "Transaction not found" });
    return;
  }
  if (!result.ok) {
    res.status(409).json({
      error: "Use DELETE /transfers/:transferId to remove a transfer",
    });
    return;
  }
  res.status(204).send();
});

export default router;

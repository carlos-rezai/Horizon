import { Router, type Request } from "express";
import {
  RecurringTransactionCreateSchema,
  RecurringTransactionUpdateSchema,
} from "../schemas/recurringTransaction.js";
import type { Storage } from "../storage/Storage.js";

const router = Router();

function getStorage(req: Request): Storage {
  return req.app.locals.storage;
}

router.post("/", async (req, res) => {
  const parsed = RecurringTransactionCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ issues: parsed.error.issues });
    return;
  }

  const created = await getStorage(req).recurringTransactions.create(
    parsed.data
  );
  if (!created) {
    res.status(404).json({ error: "Account not found" });
    return;
  }
  res.status(201).json(created);
});

router.get("/", async (req, res) => {
  const all = await getStorage(req).recurringTransactions.findAll();
  res.json(all);
});

router.patch("/:id", async (req, res) => {
  const parsed = RecurringTransactionUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ issues: parsed.error.issues });
    return;
  }

  const updated = await getStorage(req).recurringTransactions.update(
    req.params.id,
    parsed.data
  );
  if (!updated) {
    res.status(404).json({ error: "Recurring transaction not found" });
    return;
  }
  res.json(updated);
});

router.delete("/:id", async (req, res) => {
  const ok = await getStorage(req).recurringTransactions.delete(req.params.id);
  if (!ok) {
    res.status(404).json({ error: "Recurring transaction not found" });
    return;
  }
  res.status(204).send();
});

export default router;

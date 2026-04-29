import { Router, type Request } from "express";
import {
  RecurringTransactionCreateSchema,
  RecurringTransactionUpdateSchema,
} from "../schemas/recurringTransaction.js";
import type { Storage } from "../storage/Storage.js";
import type { RecurringTransaction } from "../storage/types.js";

const router = Router();

function getStorage(req: Request): Storage {
  return req.app.locals.storage;
}

function toWire(r: RecurringTransaction): Record<string, unknown> {
  const out: Record<string, unknown> = {
    _id: r.id,
    accountId: r.accountId,
    amount: r.amount,
    description: r.description,
    category: r.category,
    frequency: r.frequency,
    dayOfMonth: r.dayOfMonth,
    isActive: r.isActive,
  };
  if (r.linkedAccountId !== undefined) out.linkedAccountId = r.linkedAccountId;
  if (r.monthOfYear !== undefined) out.monthOfYear = r.monthOfYear;
  return out;
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
  res.status(201).json(toWire(created));
});

router.get("/", async (req, res) => {
  const all = await getStorage(req).recurringTransactions.findAll();
  res.json(all.map(toWire));
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
  res.json(toWire(updated));
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

import { Router } from "express";
import { randomUUID } from "crypto";
import mongoose from "mongoose";
import { Account } from "../models/Account.js";
import { Transaction } from "../models/Transaction.js";

const router = Router();

router.post("/", async (req, res) => {
  const { fromAccountId, toAccountId, amount, date, description, category } =
    req.body;

  if (
    !mongoose.isValidObjectId(fromAccountId) ||
    !(await Account.findById(fromAccountId))
  ) {
    res.status(404).json({ error: "Source account not found" });
    return;
  }

  if (
    !mongoose.isValidObjectId(toAccountId) ||
    !(await Account.findById(toAccountId))
  ) {
    res.status(404).json({ error: "Destination account not found" });
    return;
  }

  const transferId = randomUUID();

  await Transaction.create([
    {
      accountId: fromAccountId,
      date,
      amount: -amount,
      description,
      category,
      transferId,
    },
    {
      accountId: toAccountId,
      date,
      amount,
      description,
      category,
      transferId,
    },
  ]);

  res.status(201).json({ transferId });
});

router.delete("/:transferId", async (req, res) => {
  const { transferId } = req.params;

  const legs = await Transaction.find({ transferId });
  if (legs.length === 0) {
    res.status(404).json({ error: "Transfer not found" });
    return;
  }

  await Transaction.deleteMany({ transferId });
  res.status(204).send();
});

export default router;

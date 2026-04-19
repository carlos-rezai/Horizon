import { Router } from "express";
import mongoose from "mongoose";
import { RecurringTransaction } from "../models/RecurringTransaction.js";

const router = Router();

router.post("/", async (req, res) => {
  const {
    accountId,
    amount,
    description,
    category,
    frequency,
    dayOfMonth,
    linkedAccountId,
    monthOfYear,
  } = req.body;

  if (
    !accountId ||
    amount === undefined ||
    !description ||
    !category ||
    !frequency ||
    dayOfMonth === undefined
  ) {
    res.status(400).json({
      error:
        "accountId, amount, description, category, frequency, and dayOfMonth are required",
    });
    return;
  }

  const recurring = await RecurringTransaction.create({
    accountId,
    amount,
    description,
    category,
    frequency,
    dayOfMonth,
    ...(linkedAccountId !== undefined && { linkedAccountId }),
    ...(monthOfYear !== undefined && { monthOfYear }),
  });

  res.status(201).json(recurring.toJSON());
});

router.get("/", async (_req, res) => {
  const recurrings = await RecurringTransaction.find();
  res.json(recurrings.map((r) => r.toJSON()));
});

router.patch("/:id", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(404).json({ error: "Recurring transaction not found" });
    return;
  }

  const {
    amount,
    description,
    category,
    isActive,
    frequency,
    dayOfMonth,
    linkedAccountId,
    monthOfYear,
  } = req.body;
  const update: Record<string, unknown> = {};
  if (amount !== undefined) update.amount = amount;
  if (description !== undefined) update.description = description;
  if (category !== undefined) update.category = category;
  if (isActive !== undefined) update.isActive = isActive;
  if (frequency !== undefined) update.frequency = frequency;
  if (dayOfMonth !== undefined) update.dayOfMonth = dayOfMonth;
  if (linkedAccountId !== undefined) update.linkedAccountId = linkedAccountId;
  if (monthOfYear !== undefined) update.monthOfYear = monthOfYear;

  const recurring = await RecurringTransaction.findByIdAndUpdate(
    req.params.id,
    update,
    { returnDocument: "after" }
  );

  if (!recurring) {
    res.status(404).json({ error: "Recurring transaction not found" });
    return;
  }

  res.json(recurring.toJSON());
});

router.delete("/:id", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(404).json({ error: "Recurring transaction not found" });
    return;
  }

  const recurring = await RecurringTransaction.findById(req.params.id);
  if (!recurring) {
    res.status(404).json({ error: "Recurring transaction not found" });
    return;
  }

  await recurring.deleteOne();
  res.status(204).send();
});

export default router;

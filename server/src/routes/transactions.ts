import { Router } from "express";
import mongoose from "mongoose";
import { Account } from "../models/Account.js";
import { Transaction } from "../models/Transaction.js";

const router = Router();

router.post("/accounts/:id/transactions", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(404).json({ error: "Account not found" });
    return;
  }

  const account = await Account.findById(req.params.id);
  if (!account) {
    res.status(404).json({ error: "Account not found" });
    return;
  }

  const { date, amount, description, category } = req.body;
  if (!date || amount === undefined || !description || !category) {
    res
      .status(400)
      .json({ error: "date, amount, description, and category are required" });
    return;
  }

  const transaction = await Transaction.create({
    accountId: account._id,
    date,
    amount,
    description,
    category,
  });

  res.status(201).json(transaction.toJSON());
});

router.get("/accounts/:id/transactions", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(404).json({ error: "Account not found" });
    return;
  }

  const account = await Account.findById(req.params.id);
  if (!account) {
    res.status(404).json({ error: "Account not found" });
    return;
  }

  const transactions = await Transaction.find({ accountId: account._id }).sort({
    date: -1,
  });
  res.json(transactions.map((t) => t.toJSON()));
});

router.patch("/transactions/:id", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(404).json({ error: "Transaction not found" });
    return;
  }

  const { amount, description, category, date } = req.body;
  const update: Record<string, unknown> = {};
  if (amount !== undefined) update.amount = amount;
  if (description !== undefined) update.description = description;
  if (category !== undefined) update.category = category;
  if (date !== undefined) update.date = date;

  const transaction = await Transaction.findByIdAndUpdate(
    req.params.id,
    update,
    {
      returnDocument: "after",
    }
  );

  if (!transaction) {
    res.status(404).json({ error: "Transaction not found" });
    return;
  }

  res.json(transaction.toJSON());
});

router.delete("/transactions/:id", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(404).json({ error: "Transaction not found" });
    return;
  }

  const transaction = await Transaction.findById(req.params.id);
  if (!transaction) {
    res.status(404).json({ error: "Transaction not found" });
    return;
  }

  await transaction.deleteOne();
  res.status(204).send();
});

export default router;

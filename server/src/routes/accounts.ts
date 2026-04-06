import { Router } from "express";
import mongoose from "mongoose";
import { Account } from "../models/Account.js";
import { Transaction } from "../models/Transaction.js";

const router = Router();

router.post("/", async (req, res) => {
  const { kind, name, openingBalance, openingDate, sondertilgungAllowance } =
    req.body;

  if (!kind || !name || openingBalance === undefined || !openingDate) {
    res.status(400).json({
      error: "kind, name, openingBalance, and openingDate are required",
    });
    return;
  }

  const account = await Account.create({
    kind,
    name,
    openingBalance,
    openingDate,
    ...(sondertilgungAllowance !== undefined && { sondertilgungAllowance }),
  });

  res.status(201).json(account.toJSON());
});

router.get("/", async (_req, res) => {
  const accounts = await Account.find();
  const result = await Promise.all(
    accounts.map(async (a) => {
      const txs = await Transaction.find({ accountId: a._id });
      const balance =
        a.openingBalance + txs.reduce((sum, tx) => sum + tx.amount, 0);
      return { ...a.toJSON(), balance };
    })
  );
  res.json(result);
});

router.get("/:id", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(404).json({ error: "Account not found" });
    return;
  }

  const account = await Account.findById(req.params.id);
  if (!account) {
    res.status(404).json({ error: "Account not found" });
    return;
  }

  const txs = await Transaction.find({ accountId: account._id });
  const balance =
    account.openingBalance + txs.reduce((sum, tx) => sum + tx.amount, 0);
  res.json({ ...account.toJSON(), balance });
});

router.patch("/:id", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(404).json({ error: "Account not found" });
    return;
  }

  const account = await Account.findByIdAndUpdate(
    req.params.id,
    { name: req.body.name },
    { returnDocument: "after" }
  );

  if (!account) {
    res.status(404).json({ error: "Account not found" });
    return;
  }

  const txs = await Transaction.find({ accountId: account._id });
  const balance =
    account.openingBalance + txs.reduce((sum, tx) => sum + tx.amount, 0);
  res.json({ ...account.toJSON(), balance });
});

router.delete("/:id", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(404).json({ error: "Account not found" });
    return;
  }

  const account = await Account.findById(req.params.id);
  if (!account) {
    res.status(404).json({ error: "Account not found" });
    return;
  }

  const hasTransactions = await Transaction.exists({ accountId: account._id });
  if (hasTransactions) {
    res.status(409).json({ error: "Cannot delete account with transactions" });
    return;
  }

  await account.deleteOne();
  res.status(204).send();
});

export default router;

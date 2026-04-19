import { Router } from "express";
import mongoose from "mongoose";
import { Account } from "../models/Account.js";
import { Transaction } from "../models/Transaction.js";
import {
  calcNetCashflow,
  calcFreeCashflow,
  calcTotalLiquid,
} from "../lib/cashflow.js";

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
  const sums = await Transaction.aggregate<{ _id: string; total: number }>([
    { $group: { _id: "$accountId", total: { $sum: "$amount" } } },
  ]);
  const sumById = new Map(sums.map((s) => [String(s._id), s.total]));
  const result = accounts.map((a) => ({
    ...a.toJSON(),
    balance: a.openingBalance + (sumById.get(String(a._id)) ?? 0),
  }));
  res.json(result);
});

router.get("/liquid", async (_req, res) => {
  const accounts = await Account.find();
  const sums = await Transaction.aggregate<{ _id: string; total: number }>([
    { $group: { _id: "$accountId", total: { $sum: "$amount" } } },
  ]);
  const sumById = new Map(sums.map((s) => [String(s._id), s.total]));
  const entries = accounts.map((a) => ({
    _id: String(a._id),
    kind: a.kind,
    balance: a.openingBalance + (sumById.get(String(a._id)) ?? 0),
  }));
  res.json({ totalLiquid: calcTotalLiquid(entries) });
});

router.get("/:id/cashflow", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(404).json({ error: "Account not found" });
    return;
  }

  const account = await Account.findById(req.params.id);
  if (!account) {
    res.status(404).json({ error: "Account not found" });
    return;
  }

  const { month } = req.query;
  const allTxs = await Transaction.find({ accountId: account._id });

  const txs = (
    typeof month === "string"
      ? allTxs.filter((tx) => tx.date.startsWith(month))
      : allTxs
  ).map((tx) => ({
    amount: tx.amount,
    accountId: String(tx.accountId),
    transferId: tx.transferId,
  }));

  res.json({
    netCashflow: calcNetCashflow(txs),
    freeCashflow: calcFreeCashflow(txs, String(account._id)),
  });
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

  const { name, openingBalance } = req.body;
  const update: Record<string, unknown> = {};
  if (name !== undefined) update.name = name;
  if (openingBalance !== undefined) update.openingBalance = openingBalance;

  const account = await Account.findByIdAndUpdate(req.params.id, update, {
    returnDocument: "after",
  });

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

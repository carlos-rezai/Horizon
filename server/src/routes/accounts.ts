import { Router } from "express";
import mongoose from "mongoose";
import { Account } from "../models/Account.js";

const router = Router();

router.post("/", async (req, res) => {
  const { kind, name, openingBalance, openingDate, sondertilgungAllowance } =
    req.body;

  if (!kind || !name || openingBalance === undefined || !openingDate) {
    res
      .status(400)
      .json({
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
  res.json(
    accounts.map((a) => ({
      ...a.toJSON(),
      balance: a.openingBalance,
    }))
  );
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

  res.json({ ...account.toJSON(), balance: account.openingBalance });
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

  res.json({ ...account.toJSON(), balance: account.openingBalance });
});

router.delete("/:id", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(404).json({ error: "Account not found" });
    return;
  }

  // Guard: block deletion if account has transactions (enforced in Phase 2)
  const account = await Account.findById(req.params.id);
  if (!account) {
    res.status(404).json({ error: "Account not found" });
    return;
  }

  await account.deleteOne();
  res.status(204).send();
});

export default router;

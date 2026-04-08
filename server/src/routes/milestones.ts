import { Router } from "express";
import mongoose from "mongoose";
import { Milestone } from "../models/Milestone.js";
import { Account } from "../models/Account.js";

const router = Router();

router.post("/", async (req, res) => {
  const { name, accountId, targetBalance } = req.body;

  if (!name || !accountId || targetBalance === undefined) {
    res
      .status(400)
      .json({ error: "name, accountId, and targetBalance are required" });
    return;
  }

  if (typeof targetBalance !== "number" || targetBalance < 0) {
    res
      .status(400)
      .json({ error: "targetBalance must be a non-negative number" });
    return;
  }

  if (
    !mongoose.isValidObjectId(accountId) ||
    !(await Account.exists({ _id: accountId }))
  ) {
    res.status(404).json({ error: "Account not found" });
    return;
  }

  const milestone = await Milestone.create({ name, accountId, targetBalance });
  res.status(201).json(milestone.toJSON());
});

router.get("/", async (_req, res) => {
  const milestones = await Milestone.find();
  res.json(milestones.map((m) => m.toJSON()));
});

router.delete("/:id", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(404).json({ error: "Milestone not found" });
    return;
  }

  const milestone = await Milestone.findByIdAndDelete(req.params.id);
  if (!milestone) {
    res.status(404).json({ error: "Milestone not found" });
    return;
  }

  res.status(204).send();
});

export default router;

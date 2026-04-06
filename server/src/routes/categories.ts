import { Router } from "express";
import mongoose from "mongoose";
import { Category } from "../models/Category.js";
import { Transaction } from "../models/Transaction.js";

const router = Router();

router.get("/", async (_req, res) => {
  const categories = await Category.find();
  res.json(categories);
});

router.post("/", async (req, res) => {
  const { name } = req.body;

  if (!name) {
    res.status(400).json({ error: "name is required" });
    return;
  }

  const category = await Category.create({ name, isDefault: false });
  res.status(201).json(category);
});

router.delete("/:id", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(404).json({ error: "Category not found" });
    return;
  }

  const category = await Category.findById(req.params.id);
  if (!category) {
    res.status(404).json({ error: "Category not found" });
    return;
  }

  if (category.isDefault) {
    res.status(409).json({ error: "Default categories cannot be deleted" });
    return;
  }

  const inUse = await Transaction.exists({ category: category.name });
  if (inUse) {
    res.status(409).json({ error: "Category is referenced by transactions" });
    return;
  }

  await category.deleteOne();
  res.status(204).send();
});

export default router;

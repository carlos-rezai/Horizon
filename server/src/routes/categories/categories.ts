import { Router, type Request } from "express";
import { CategoryCreateSchema, CategoryPatchSchema } from "./category.js";
import type { Storage } from "../../storage/Storage.js";

const router = Router();

function getStorage(req: Request): Storage {
  return req.app.locals.storage;
}

router.get("/", async (req, res) => {
  const categories = await getStorage(req).categories.findAll();
  res.json(categories);
});

router.post("/", async (req, res) => {
  const parsed = CategoryCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ issues: parsed.error.issues });
    return;
  }
  const result = await getStorage(req).categories.create(parsed.data);
  if (!result.ok) {
    if (result.reason === "invalid_name") {
      res.status(400).json({ error: "Category name must not be empty" });
      return;
    }
    res
      .status(409)
      .json({ error: `A category named "${parsed.data.name}" already exists` });
    return;
  }
  res.status(201).json(result.category);
});

router.patch("/:id", async (req, res) => {
  const parsed = CategoryPatchSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ issues: parsed.error.issues });
    return;
  }
  const { color, name } = parsed.data;

  if (name !== undefined) {
    const result = await getStorage(req).categories.rename(req.params.id, name);
    if (result === null) {
      res.status(404).json({ error: "Category not found" });
      return;
    }
    if (!result.ok) {
      if (result.reason === "invalid_name") {
        res.status(400).json({ error: "Category name must not be empty" });
        return;
      }
      if (result.reason === "is_default") {
        res.status(409).json({ error: "Default categories cannot be renamed" });
        return;
      }
      res
        .status(409)
        .json({ error: `A category named "${name.trim()}" already exists` });
      return;
    }
    res.status(200).json(result.category);
    return;
  }

  if (color === undefined) {
    res.status(400).json({ error: "No supported fields to update" });
    return;
  }
  const updated = await getStorage(req).categories.recolor(
    req.params.id,
    color
  );
  if (updated === null) {
    res.status(404).json({ error: "Category not found" });
    return;
  }
  res.status(200).json(updated);
});

router.delete("/:id", async (req, res) => {
  const result = await getStorage(req).categories.delete(req.params.id);
  if (result === null) {
    res.status(404).json({ error: "Category not found" });
    return;
  }
  if (!result.ok) {
    if (result.reason === "is_default") {
      res.status(409).json({ error: "Default categories cannot be deleted" });
      return;
    }
    res.status(409).json({ error: "Category is referenced by transactions" });
    return;
  }
  res.status(204).send();
});

export default router;

import { Router, type Request, type Response } from "express";
import { CategoryCreateSchema, CategoryPatchSchema } from "./category.js";
import type { Storage } from "../../storage/Storage.js";

const router = Router();

function getStorage(req: Request): Storage {
  return req.app.locals.storage;
}

interface HttpError {
  status: number;
  error: string;
}

function sendNotFound(res: Response): void {
  res.status(404).json({ error: "Category not found" });
}

// Single source for the name-collision message shared by create and rename.
function collisionMessage(name: string): string {
  return `A category named "${name}" already exists`;
}

// Maps a category mutation result to its HTTP response: null is 404, a
// { ok: false, reason } is looked up in `failures` (falling back to
// `otherwise` for reasons a given call does not special-case), and success
// is handed to `onOk`.
function respondToMutation<
  T extends { ok: true } | { ok: false; reason: string },
>(
  res: Response,
  result: T | null,
  failures: Record<string, HttpError>,
  onOk: (result: Extract<T, { ok: true }>) => void,
  otherwise?: HttpError
): void {
  if (result === null) {
    sendNotFound(res);
    return;
  }
  if (!result.ok) {
    const mapped = failures[result.reason] ?? otherwise;
    res.status(mapped.status).json({ error: mapped.error });
    return;
  }
  onOk(result as Extract<T, { ok: true }>);
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
  respondToMutation(
    res,
    result,
    {
      invalid_name: { status: 400, error: "Category name must not be empty" },
      collision: { status: 409, error: collisionMessage(parsed.data.name) },
    },
    (ok) => res.status(201).json(ok.category)
  );
});

router.patch("/:id", async (req, res) => {
  const parsed = CategoryPatchSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ issues: parsed.error.issues });
    return;
  }
  const { color, name, hidden } = parsed.data;

  if (hidden !== undefined) {
    const result = await getStorage(req).categories.setHidden(
      req.params.id,
      hidden
    );
    respondToMutation(
      res,
      result,
      {
        is_custom: { status: 409, error: "Custom categories cannot be hidden" },
      },
      (ok) => res.status(200).json(ok.category)
    );
    return;
  }

  if (name !== undefined) {
    const result = await getStorage(req).categories.rename(req.params.id, name);
    respondToMutation(
      res,
      result,
      {
        invalid_name: { status: 400, error: "Category name must not be empty" },
        is_default: {
          status: 409,
          error: "Default categories cannot be renamed",
        },
        collision: { status: 409, error: collisionMessage(name.trim()) },
      },
      (ok) => res.status(200).json(ok.category)
    );
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
    sendNotFound(res);
    return;
  }
  res.status(200).json(updated);
});

router.delete("/:id", async (req, res) => {
  const reassignTo =
    typeof req.query.reassignTo === "string" ? req.query.reassignTo : undefined;
  const result = await getStorage(req).categories.delete(
    req.params.id,
    reassignTo
  );
  respondToMutation(
    res,
    result,
    {
      is_default: {
        status: 409,
        error: "Default categories cannot be deleted",
      },
    },
    () => res.status(204).send(),
    { status: 409, error: "Category is referenced by transactions" }
  );
});

export default router;

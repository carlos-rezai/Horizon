import { Router, type Request } from "express";
import { ImportCreateSchema } from "./import.js";
import type { Storage } from "../../storage/Storage.js";

const router = Router();

function getStorage(req: Request): Storage {
  return req.app.locals.storage;
}

router.post("/", async (req, res) => {
  const parsed = ImportCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ issues: parsed.error.issues });
    return;
  }

  const { mapping, ...input } = parsed.data;

  const created = await getStorage(req).imports.create(input);
  if (!created) {
    res.status(404).json({ error: "Account not found" });
    return;
  }

  // Remember the per-bank column mapping so the next import of the same bank
  // pre-fills it.
  await getStorage(req).importPresets.upsert(input.bank, mapping);

  res.status(201).json(created);
});

router.get("/", async (req, res) => {
  const storage = getStorage(req);
  const { accountId } = req.query;
  const imports =
    typeof accountId === "string"
      ? await storage.imports.findByAccount(accountId)
      : await storage.imports.findAll();
  res.json(imports);
});

router.get("/:id/transactions", async (req, res) => {
  const txs = await getStorage(req).imports.findTransactions(req.params.id);
  res.json(txs);
});

router.delete("/:id", async (req, res) => {
  const ok = await getStorage(req).imports.delete(req.params.id);
  if (!ok) {
    res.status(404).json({ error: "Import not found" });
    return;
  }
  res.status(204).send();
});

export default router;

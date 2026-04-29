import { Router, type Request } from "express";
import { TransferCreateSchema } from "../schemas/transfer.js";
import type { Storage } from "../storage/Storage.js";

const router = Router();

function getStorage(req: Request): Storage {
  return req.app.locals.storage;
}

router.post("/", async (req, res) => {
  const parsed = TransferCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ issues: parsed.error.issues });
    return;
  }

  const storage = getStorage(req);
  const fromAccount = await storage.accounts.findById(
    parsed.data.fromAccountId
  );
  if (!fromAccount) {
    res.status(404).json({ error: "Source account not found" });
    return;
  }
  const toAccount = await storage.accounts.findById(parsed.data.toAccountId);
  if (!toAccount) {
    res.status(404).json({ error: "Destination account not found" });
    return;
  }

  const result = await storage.transfers.create(parsed.data);
  if (!result) {
    res.status(404).json({ error: "Account not found" });
    return;
  }

  res.status(201).json(result);
});

router.delete("/:transferId", async (req, res) => {
  const ok = await getStorage(req).transfers.delete(req.params.transferId);
  if (!ok) {
    res.status(404).json({ error: "Transfer not found" });
    return;
  }
  res.status(204).send();
});

export default router;

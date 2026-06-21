import { randomUUID } from "crypto";
import { Router, type Request } from "express";
import multer from "multer";
import { ImportCreateSchema } from "./import.js";
import {
  detectStatement,
  mapStatementRows,
  detectDuplicates,
  detectRecurring,
  StatementParseError,
} from "../../lib/csvImport/index.js";
import type { Storage } from "../../storage/Storage.js";

const router = Router();

/** Max upload size before buffering; the German bank exports are kilobytes. */
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
}).single("file");

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

router.post("/preview", (req, res) => {
  upload(req, res, async (err: unknown) => {
    // Any multer rejection — oversized file or more than one file — is caught
    // before the bytes are buffered and answered with 413.
    if (err instanceof multer.MulterError) {
      res.status(413).json({ error: "File too large or too many files" });
      return;
    }
    if (err) {
      res.status(413).json({ error: "Upload rejected" });
      return;
    }

    if (!req.file) {
      res.status(422).json({ error: "No file uploaded" });
      return;
    }

    const accountId =
      typeof req.body.accountId === "string" ? req.body.accountId : "";

    let detected;
    try {
      detected = detectStatement(req.file.buffer);
    } catch (parseErr) {
      if (parseErr instanceof StatementParseError) {
        res.status(422).json({ error: parseErr.message });
        return;
      }
      throw parseErr;
    }

    const storage = getStorage(req);

    // Reuse the bank's remembered mapping if one was saved on a past commit;
    // otherwise fall back to the detected default the user can adjust.
    const remembered = await storage.importPresets.get(detected.bank);
    const mapping = remembered ?? detected.mapping;
    const mappedRows = mapStatementRows(detected, mapping);

    const existingTxns = await storage.transactions.findByAccount(accountId);
    const recurring = (await storage.recurringTransactions.findAll()).filter(
      (rule) => rule.accountId === accountId
    );

    const duplicateFlags = detectDuplicates(mappedRows, existingTxns);
    const recurringFlags = detectRecurring(mappedRows, recurring);

    const rows = mappedRows.map((row, index) => ({
      id: randomUUID(),
      ...row,
      duplicate: duplicateFlags[index],
      recurring: recurringFlags[index],
    }));

    res.json({
      bank: detected.bank,
      mapping,
      columns: detected.columns,
      rows,
      summary: {
        total: rows.length,
        duplicates: duplicateFlags.filter(Boolean).length,
        recurring: recurringFlags.filter(Boolean).length,
      },
    });
  });
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

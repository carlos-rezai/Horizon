import { Router, type Request } from "express";
import multer from "multer";
import { ImportCreateSchema, describeImportIssues } from "./import.js";
import {
  buildPreview,
  StatementParseError,
} from "../../lib/csvImport/index.js";
import type { Storage } from "../../storage/Storage.js";
import type { ColumnMapping } from "../../storage/types.js";

/**
 * Parse an optional `mapping` multipart field into a {@link ColumnMapping}
 * override. Multipart fields arrive as strings, so the wizard sends the map as
 * JSON. A missing, unparseable, or ill-shaped value yields `undefined` — the
 * preview then falls back to remembered/detected exactly as before.
 */
function parseMappingField(raw: unknown): ColumnMapping | undefined {
  if (typeof raw !== "string" || raw.length === 0) return undefined;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return undefined;
  }
  if (typeof value !== "object" || value === null) return undefined;
  const { date, description, amount } = value as Record<string, unknown>;
  if (
    typeof date !== "string" ||
    typeof description !== "string" ||
    typeof amount !== "string"
  ) {
    return undefined;
  }
  return { date, description, amount };
}

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
    // Both fields, always: `error` is the readable floor, `issues` is the
    // structure the client attributes back onto the offending rows.
    res.status(400).json({
      error: describeImportIssues(parsed.error.issues),
      issues: parsed.error.issues,
    });
    return;
  }

  const { mapping, delimiter, decimal, dateFmt, ...input } = parsed.data;

  const created = await getStorage(req).imports.create(input);
  if (!created) {
    res.status(404).json({ error: "Account not found" });
    return;
  }

  // Remember the per-bank mapping and full format so the next import of the
  // same bank pre-fills the columns and re-applies the decimal/date format.
  await getStorage(req).importPresets.upsert(input.bank, {
    mapping,
    delimiter,
    decimal,
    dateFmt,
  });

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
    const mappingOverride = parseMappingField(req.body.mapping);
    const storage = getStorage(req);

    try {
      const recurring = (await storage.recurringTransactions.findAll()).filter(
        (rule) => rule.accountId === accountId
      );
      const preview = await buildPreview({
        bytes: req.file.buffer,
        existingTxns: await storage.transactions.findByAccount(accountId),
        recurring,
        getRememberedPreset: (bank) => storage.importPresets.get(bank),
        mappingOverride,
      });
      res.json(preview);
    } catch (parseErr) {
      // A statement we can't parse is a 422 with the engine's message; any
      // other failure is a genuine 500 and re-thrown to the error handler.
      if (parseErr instanceof StatementParseError) {
        res.status(422).json({ error: parseErr.message });
        return;
      }
      throw parseErr;
    }
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

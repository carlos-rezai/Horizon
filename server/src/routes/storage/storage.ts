import { Router, type Request } from "express";
import multer from "multer";
import fs from "fs";
import os from "os";
import type { Storage } from "../../storage/Storage.js";
import { StorageIntegrityError } from "../../storage/sqlite/errors.js";

const router = Router();

const RESTORE_INTEGRITY_MESSAGE = "Backup file failed integrity check";
const RESTORE_FUTURE_SCHEMA_MESSAGE =
  "Backup was written by a newer version of Horizon";

const upload = multer({ dest: os.tmpdir() });

function getStorage(req: Request): Storage {
  return req.app.locals.storage;
}

async function safeUnlink(p: string): Promise<void> {
  try {
    await fs.promises.unlink(p);
  } catch {
    // ignore — file may not exist
  }
}

function mapIntegrityErrorMessage(err: StorageIntegrityError): string {
  if (/ahead of/i.test(err.message)) {
    return RESTORE_FUTURE_SCHEMA_MESSAGE;
  }
  return RESTORE_INTEGRITY_MESSAGE;
}

router.get("/status", async (req, res) => {
  const status = await getStorage(req).status();
  res.json(status);
});

router.post("/backup", (req, res, next) => {
  try {
    const buffer = getStorage(req).serialize();
    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="horizon-backup.db"'
    );
    res.send(buffer);
  } catch (err) {
    next(err);
  }
});

router.post("/backup-to", async (req, res, next) => {
  const destPath = (req.body as { path?: unknown }).path;

  if (typeof destPath !== "string" || destPath.length === 0) {
    res.status(400).json({ error: "Missing 'path' in request body" });
    return;
  }

  try {
    await getStorage(req).backup(destPath);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

router.post("/restore", upload.single("file"), async (req, res, next) => {
  const uploaded = req.file;

  if (!uploaded) {
    res.status(400).json({ error: "Missing 'file' upload" });
    return;
  }

  try {
    await getStorage(req).restore(uploaded.path);
    res.status(204).end();
  } catch (err) {
    if (err instanceof StorageIntegrityError) {
      res.status(400).json({ error: mapIntegrityErrorMessage(err) });
      return;
    }
    next(err);
  } finally {
    await safeUnlink(uploaded.path);
  }
});

export default router;

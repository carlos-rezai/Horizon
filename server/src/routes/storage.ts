import { Router, type Request } from "express";
import multer from "multer";
import fs from "fs";
import os from "os";
import path from "path";
import { randomUUID } from "crypto";
import type { Storage } from "../storage/Storage.js";
import { StorageIntegrityError } from "../storage/sqlite/errors.js";

const router = Router();

const UNSUPPORTED_BACKUP_MESSAGE = "Storage driver does not support backup";
const UNSUPPORTED_RESTORE_MESSAGE = "Storage driver does not support restore";
const RESTORE_INTEGRITY_MESSAGE = "Backup file failed integrity check";
const RESTORE_FUTURE_SCHEMA_MESSAGE =
  "Backup was written by a newer version of Horizon";

const upload = multer({ dest: os.tmpdir() });

function getStorage(req: Request): Storage {
  return req.app.locals.storage;
}

function makeTempPath(prefix: string): string {
  return path.join(os.tmpdir(), `horizon-${prefix}-${randomUUID()}.db`);
}

async function safeUnlink(p: string): Promise<void> {
  try {
    await fs.promises.unlink(p);
  } catch {
    // ignore — file may not exist
  }
}

function isUnsupportedDriverError(err: unknown): boolean {
  return err instanceof Error && err.message === "not supported";
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

router.post("/backup", async (req, res, next) => {
  const tempPath = makeTempPath("backup");

  try {
    await getStorage(req).backup(tempPath);
  } catch (err) {
    await safeUnlink(tempPath);
    if (isUnsupportedDriverError(err)) {
      res.status(400).json({ error: UNSUPPORTED_BACKUP_MESSAGE });
      return;
    }
    next(err);
    return;
  }

  res.setHeader("Content-Type", "application/octet-stream");
  res.setHeader(
    "Content-Disposition",
    'attachment; filename="horizon-backup.db"'
  );

  const stream = fs.createReadStream(tempPath);
  try {
    await new Promise<void>((resolve, reject) => {
      stream.on("error", reject);
      res.on("error", reject);
      res.on("close", resolve);
      res.on("finish", resolve);
      stream.pipe(res);
    });
  } finally {
    await safeUnlink(tempPath);
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
    if (isUnsupportedDriverError(err)) {
      res.status(400).json({ error: UNSUPPORTED_RESTORE_MESSAGE });
      return;
    }
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

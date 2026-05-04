import { Router, type Request } from "express";
import fs from "fs";
import os from "os";
import path from "path";
import { randomUUID } from "crypto";
import type { Storage } from "../storage/Storage.js";

const router = Router();

const UNSUPPORTED_BACKUP_MESSAGE = "Storage driver does not support backup";
const UNSUPPORTED_RESTORE_MESSAGE = "Storage driver does not support restore";

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
    // ignore — file may not exist if backup never produced it
  }
}

function isUnsupportedDriverError(err: unknown): boolean {
  return err instanceof Error && err.message === "not supported";
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

router.post("/restore", async (req, res, next) => {
  const tempPath = makeTempPath("restore");

  try {
    await getStorage(req).restore(tempPath);
  } catch (err) {
    await safeUnlink(tempPath);
    if (isUnsupportedDriverError(err)) {
      res.status(400).json({ error: UNSUPPORTED_RESTORE_MESSAGE });
      return;
    }
    next(err);
    return;
  } finally {
    await safeUnlink(tempPath);
  }

  res.status(204).end();
});

export default router;

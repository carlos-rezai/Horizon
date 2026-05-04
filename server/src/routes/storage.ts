import { Router, type Request } from "express";
import fs from "fs";
import os from "os";
import path from "path";
import { randomUUID } from "crypto";
import type { Storage } from "../storage/Storage.js";

const router = Router();

function getStorage(req: Request): Storage {
  return req.app.locals.storage;
}

function makeTempPath(): string {
  return path.join(os.tmpdir(), `horizon-backup-${randomUUID()}.db`);
}

async function safeUnlink(p: string): Promise<void> {
  try {
    await fs.promises.unlink(p);
  } catch {
    // ignore — file may not exist if backup never produced it
  }
}

router.get("/status", async (req, res) => {
  const status = await getStorage(req).status();
  res.json(status);
});

router.post("/backup", async (req, res) => {
  const tempPath = makeTempPath();

  try {
    await getStorage(req).backup(tempPath);
  } catch (err) {
    await safeUnlink(tempPath);
    res.status(501).json({
      error: err instanceof Error ? err.message : String(err),
    });
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

export default router;

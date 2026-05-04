import type Database from "better-sqlite3";
import { StorageIntegrityError } from "./errors.js";

export function assertIntegrity(db: Database.Database): void {
  const rows = db.pragma("integrity_check") as Array<{
    integrity_check: string;
  }>;
  const detail = rows.map((r) => r.integrity_check).join("\n");
  if (detail !== "ok") {
    throw new StorageIntegrityError(`SQLite integrity_check failed: ${detail}`);
  }
}

export function assertSchemaNotAhead(
  db: Database.Database,
  maxVersion: number
): void {
  const userVersion = db.pragma("user_version", {
    simple: true,
  }) as number;
  if (userVersion > maxVersion) {
    throw new StorageIntegrityError(
      `Database user_version ${userVersion} is ahead of the latest known migration ${maxVersion}. This database was written by a newer build of Horizon.`
    );
  }
}

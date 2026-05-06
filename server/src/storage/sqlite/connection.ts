import Database from "better-sqlite3";
import { migrate } from "./migrate.js";
import { StorageIntegrityError } from "./errors.js";
import { assertIntegrity } from "./integrity.js";

const PRAGMAS = [
  "journal_mode = WAL",
  "synchronous = NORMAL",
  "busy_timeout = 5000",
  "foreign_keys = ON",
  "mmap_size = 67108864",
] as const;

export interface OpenConnectionOptions {
  verbose?: (sql: string) => void;
}

export function openConnection(
  path: string,
  options?: OpenConnectionOptions
): Database.Database {
  const db =
    options?.verbose !== undefined
      ? new Database(path, {
          verbose: options.verbose as (sql?: unknown) => void,
        })
      : new Database(path);
  try {
    for (const pragma of PRAGMAS) {
      db.pragma(pragma);
    }
    migrate(db);
    assertIntegrity(db);
  } catch (err) {
    db.close();
    if (err instanceof StorageIntegrityError) throw err;
    // SQLite can throw "database disk image is malformed" from inside the
    // pragma loop or PRAGMA integrity_check itself when the schema page is
    // too corrupt to enumerate. Surface those as a StorageIntegrityError so
    // callers see one error type for "this database is unusable".
    const detail = err instanceof Error ? err.message : String(err);
    throw new StorageIntegrityError(`SQLite integrity_check failed: ${detail}`);
  }
  return db;
}

export function closeConnection(db: Database.Database): void {
  if (!db.open) return;
  db.pragma("wal_checkpoint(TRUNCATE)");
  // Switching journal_mode away from WAL deletes the -wal / -shm sidecars on
  // the final close, leaving the .db file as the canonical on-disk snapshot.
  db.pragma("journal_mode = DELETE");
  db.close();
}

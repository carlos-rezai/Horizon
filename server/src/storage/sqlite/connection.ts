import Database from "better-sqlite3";
import { migrate } from "./migrate.js";

const PRAGMAS = [
  "journal_mode = WAL",
  "synchronous = NORMAL",
  "busy_timeout = 5000",
  "foreign_keys = ON",
  "mmap_size = 67108864",
] as const;

export function openConnection(path: string): Database.Database {
  const db = new Database(path);
  for (const pragma of PRAGMAS) {
    db.pragma(pragma);
  }
  migrate(db);
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

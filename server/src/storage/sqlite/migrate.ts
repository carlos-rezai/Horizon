import type Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { assertSchemaNotAhead } from "./integrity.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// import.meta.url resolves to this file's location at runtime. In the tsc
// output each module keeps its source-relative path, so __dirname is
// storage/sqlite/ and migrations live at storage/sqlite/migrations/. In the
// esbuild bundle the entire server collapses into one file, so __dirname is
// server/dist/ and migrations live at server/dist/migrations/. The copy
// scripts in scripts/ use --dest to match whichever layout is active.
const MIGRATIONS_DIR = path.join(__dirname, "migrations");

interface MigrationFile {
  version: number;
  filename: string;
  sql: string;
}

function loadMigrations(): MigrationFile[] {
  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"));
  const parsed: MigrationFile[] = [];
  for (const filename of files) {
    const match = filename.match(/^(\d+)_/);
    if (!match) continue;
    const version = Number(match[1]);
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, filename), "utf8");
    parsed.push({ version, filename, sql });
  }
  return parsed.sort((a, b) => a.version - b.version);
}

export function migrate(db: Database.Database): void {
  const migrations = loadMigrations();
  const latestVersion =
    migrations.length > 0 ? migrations[migrations.length - 1].version : 0;

  assertSchemaNotAhead(db, latestVersion);

  const currentVersion = db.pragma("user_version", {
    simple: true,
  }) as number;
  const pending = migrations.filter((m) => m.version > currentVersion);
  if (pending.length === 0) return;

  const apply = db.transaction(() => {
    for (const migration of pending) {
      db.exec(migration.sql);
    }
    const latest = pending[pending.length - 1].version;
    db.pragma(`user_version = ${latest}`);
  });
  apply();
}

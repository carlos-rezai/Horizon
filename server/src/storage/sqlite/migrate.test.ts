import { afterEach, beforeEach, describe, expect, it } from "vitest";
import Database from "better-sqlite3";
import fs from "fs";
import os from "os";
import path from "path";
import { migrate } from "./migrate.js";
import { openConnection, closeConnection } from "./connection.js";
import { DEFAULT_CATEGORY_NAMES } from "../defaultCategories.js";

interface SchemaRow {
  type: string;
  name: string;
  tbl_name: string;
  sql: string | null;
}

function snapshotSchema(db: Database.Database): SchemaRow[] {
  return db
    .prepare(
      `SELECT type, name, tbl_name, sql
         FROM sqlite_master
        WHERE name NOT LIKE 'sqlite_%'
        ORDER BY type, name`
    )
    .all() as SchemaRow[];
}

describe("migrate (SQLite)", () => {
  it("applies every migration to a fresh DB and bumps PRAGMA user_version", async () => {
    const db = new Database(":memory:");

    const before = db.pragma("user_version", { simple: true }) as number;
    expect(before).toBe(0);

    await migrate(db);

    const after = db.pragma("user_version", { simple: true }) as number;
    expect(after).toBeGreaterThan(0);

    db.close();
  });

  it("creates four tables on a fresh DB (milestones removed)", async () => {
    const db = new Database(":memory:");

    await migrate(db);

    const tables = db
      .prepare(
        `SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'`
      )
      .all() as Array<{ name: string }>;
    const names = tables.map((t) => t.name);

    expect(names).toContain("accounts");
    expect(names).toContain("transactions");
    expect(names).toContain("categories");
    expect(names).toContain("recurring_transactions");
    expect(names).not.toContain("milestones");

    db.close();
  });

  it("seeds exactly the shared DEFAULT_CATEGORY_NAMES list (no drift)", async () => {
    const db = new Database(":memory:");

    await migrate(db);

    const rows = db
      .prepare(`SELECT name FROM categories WHERE is_default = 1`)
      .all() as Array<{ name: string }>;
    const names = rows.map((r) => r.name).sort();

    expect(names).toEqual([...DEFAULT_CATEGORY_NAMES].sort());

    db.close();
  });

  it("creates the required indexes", async () => {
    const db = new Database(":memory:");

    await migrate(db);

    const indexes = db
      .prepare(`SELECT name FROM sqlite_master WHERE type = 'index'`)
      .all() as Array<{ name: string }>;
    const indexedColumns = new Set<string>();
    for (const { name } of indexes) {
      const info = db.prepare(`PRAGMA index_info(${name})`).all() as Array<{
        name: string;
      }>;
      const tableInfo = db
        .prepare(
          `SELECT tbl_name FROM sqlite_master WHERE type='index' AND name = ?`
        )
        .get(name) as { tbl_name: string } | undefined;
      if (!tableInfo) continue;
      for (const col of info) {
        indexedColumns.add(`${tableInfo.tbl_name}.${col.name}`);
      }
    }

    expect(indexedColumns).toContain("accounts.kind");
    expect(indexedColumns).toContain("transactions.account_id");
    expect(indexedColumns).toContain("transactions.transfer_id");
    expect(indexedColumns).toContain("transactions.date");
    expect(indexedColumns).toContain("recurring_transactions.account_id");
    expect(indexedColumns).not.toContain("recurring_transactions.is_active");

    db.close();
  });

  it("recurring_transactions table has no is_active column after migration", async () => {
    const db = new Database(":memory:");

    await migrate(db);

    const cols = db
      .prepare(`PRAGMA table_info(recurring_transactions)`)
      .all() as Array<{ name: string }>;
    const colNames = cols.map((c) => c.name);

    expect(colNames).not.toContain("is_active");

    db.close();
  });

  it("accounts table has icon and color columns after migration", async () => {
    const db = new Database(":memory:");

    await migrate(db);

    const cols = db.prepare(`PRAGMA table_info(accounts)`).all() as Array<{
      name: string;
    }>;
    const colNames = cols.map((c) => c.name);

    expect(colNames).toContain("icon");
    expect(colNames).toContain("color");

    db.close();
  });

  it("is idempotent: a second invocation is a no-op (no errors, version stable)", async () => {
    const db = new Database(":memory:");

    await migrate(db);
    const firstVersion = db.pragma("user_version", { simple: true }) as number;
    const firstCategoryCount = (
      db.prepare(`SELECT COUNT(*) AS n FROM categories`).get() as { n: number }
    ).n;

    expect(() => migrate(db)).not.toThrow();

    const secondVersion = db.pragma("user_version", { simple: true }) as number;
    const secondCategoryCount = (
      db.prepare(`SELECT COUNT(*) AS n FROM categories`).get() as { n: number }
    ).n;

    expect(secondVersion).toBe(firstVersion);
    expect(secondCategoryCount).toBe(firstCategoryCount);

    db.close();
  });

  it("is an explicit no-op when user_version is already at the latest: full schema snapshot and version are byte-for-byte unchanged", async () => {
    const db = new Database(":memory:");

    await migrate(db);
    const versionBefore = db.pragma("user_version", {
      simple: true,
    }) as number;
    const schemaBefore = snapshotSchema(db);

    await migrate(db);

    const versionAfter = db.pragma("user_version", {
      simple: true,
    }) as number;
    const schemaAfter = snapshotSchema(db);

    expect(versionAfter).toBe(versionBefore);
    expect(schemaAfter).toEqual(schemaBefore);

    db.close();
  });

  describe("migration 011 (imports)", () => {
    it("creates the imports and import_presets tables", async () => {
      const db = new Database(":memory:");

      await migrate(db);

      const tables = db
        .prepare(
          `SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'`
        )
        .all() as Array<{ name: string }>;
      const names = tables.map((t) => t.name);

      expect(names).toContain("imports");
      expect(names).toContain("import_presets");

      db.close();
    });

    it("adds a nullable import_id column to transactions", async () => {
      const db = new Database(":memory:");

      await migrate(db);

      const cols = db
        .prepare(`PRAGMA table_info(transactions)`)
        .all() as Array<{ name: string; notnull: number }>;
      const importId = cols.find((c) => c.name === "import_id");

      expect(importId).toBeDefined();
      expect(importId?.notnull).toBe(0);

      db.close();
    });

    it("advances PRAGMA user_version to at least 11", async () => {
      const db = new Database(":memory:");

      await migrate(db);

      const version = db.pragma("user_version", { simple: true }) as number;
      expect(version).toBeGreaterThanOrEqual(11);

      db.close();
    });
  });

  describe("migration 014 (reset import presets)", () => {
    it("advances PRAGMA user_version to at least 14", async () => {
      const db = new Database(":memory:");

      await migrate(db);

      const version = db.pragma("user_version", { simple: true }) as number;
      expect(version).toBeGreaterThanOrEqual(14);

      db.close();
    });

    it("wipes stale import_presets rows forward-only on upgrade", async () => {
      const db = new Database(":memory:");

      // Full schema first, then plant a stale remembered preset — as if left
      // behind by one of the removed guessed banks.
      await migrate(db);
      db.prepare(
        `INSERT INTO import_presets (bank, mapping, delimiter, decimal, date_fmt)
         VALUES (?, ?, ?, ?, ?)`
      ).run(
        "DKB",
        JSON.stringify({ date: "a", description: "b", amount: "c" }),
        ";",
        ",",
        "DD.MM.YYYY"
      );

      // Rewind to just before 014 and re-run: the reset migration must re-apply
      // and delete every remembered preset so the corrected built-in defaults
      // win on the next import.
      db.pragma("user_version = 13");
      await migrate(db);

      const count = (
        db.prepare(`SELECT COUNT(*) AS n FROM import_presets`).get() as {
          n: number;
        }
      ).n;
      expect(count).toBe(0);
      expect(db.pragma("user_version", { simple: true }) as number).toBe(14);

      db.close();
    });
  });

  describe("migration 015 (category hidden)", () => {
    it("adds a NOT NULL hidden column defaulting to 0 on categories", async () => {
      const db = new Database(":memory:");

      await migrate(db);

      const cols = db.prepare(`PRAGMA table_info(categories)`).all() as Array<{
        name: string;
        notnull: number;
        dflt_value: string | null;
      }>;
      const hidden = cols.find((c) => c.name === "hidden");

      expect(hidden).toBeDefined();
      expect(hidden?.notnull).toBe(1);
      expect(hidden?.dflt_value).toBe("0");

      db.close();
    });

    it("advances PRAGMA user_version to at least 15", async () => {
      const db = new Database(":memory:");

      await migrate(db);

      const version = db.pragma("user_version", { simple: true }) as number;
      expect(version).toBeGreaterThanOrEqual(15);

      db.close();
    });

    it("backfills hidden = 0 on the pre-existing seeded default categories", async () => {
      // The default categories are seeded in migration 001 — they exist before
      // 015 adds the column, so NOT NULL DEFAULT 0 must forward-fill them to 0.
      const db = new Database(":memory:");

      await migrate(db);

      const rows = db
        .prepare(`SELECT name, hidden FROM categories WHERE is_default = 1`)
        .all() as Array<{ name: string; hidden: number }>;

      expect(rows.length).toBeGreaterThan(0);
      for (const row of rows) {
        expect(row.hidden).toBe(0);
      }

      db.close();
    });
  });

  describe("tempfile lifecycle", () => {
    let dbPath: string;

    beforeEach(() => {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), "horizon-migrate-"));
      dbPath = path.join(dir, "horizon.db");
    });

    afterEach(() => {
      fs.rmSync(path.dirname(dbPath), { recursive: true, force: true });
    });

    it("open → migrate → close → reopen → migrate is a no-op across a process restart (version and schema snapshot identical)", async () => {
      const first = openConnection(dbPath);
      const versionAfterFirstMigrate = first.pragma("user_version", {
        simple: true,
      }) as number;
      const schemaAfterFirstMigrate = snapshotSchema(first);
      closeConnection(first);

      const second = openConnection(dbPath);
      const versionAfterReopen = second.pragma("user_version", {
        simple: true,
      }) as number;
      const schemaAfterReopen = snapshotSchema(second);

      await migrate(second);

      const versionAfterSecondMigrate = second.pragma("user_version", {
        simple: true,
      }) as number;
      const schemaAfterSecondMigrate = snapshotSchema(second);

      expect(versionAfterFirstMigrate).toBeGreaterThan(0);
      expect(versionAfterReopen).toBe(versionAfterFirstMigrate);
      expect(versionAfterSecondMigrate).toBe(versionAfterFirstMigrate);
      expect(schemaAfterReopen).toEqual(schemaAfterFirstMigrate);
      expect(schemaAfterSecondMigrate).toEqual(schemaAfterFirstMigrate);

      closeConnection(second);
    });
  });
});

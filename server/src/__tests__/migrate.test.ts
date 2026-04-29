import { describe, expect, it } from "vitest";
import Database from "better-sqlite3";
import { migrate } from "../storage/sqlite/migrate.js";

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

  it("creates all five tables on a fresh DB", async () => {
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
    expect(names).toContain("milestones");
    expect(names).toContain("recurring_transactions");

    db.close();
  });

  it("seeds default categories", async () => {
    const db = new Database(":memory:");

    await migrate(db);

    const rows = db
      .prepare(`SELECT name FROM categories WHERE is_default = 1`)
      .all() as Array<{ name: string }>;
    const names = rows.map((r) => r.name);

    for (const expected of [
      "Income",
      "Housing",
      "Food",
      "Subscriptions",
      "Entertainment",
      "Investment",
      "Transfer",
      "Miscellaneous",
    ]) {
      expect(names).toContain(expected);
    }

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
    expect(indexedColumns).toContain("recurring_transactions.is_active");

    db.close();
  });

  it("is idempotent: a second invocation is a no-op (no errors, version stable)", async () => {
    const db = new Database(":memory:");

    await migrate(db);
    const firstVersion = db.pragma("user_version", { simple: true }) as number;
    const firstCategoryCount = (
      db.prepare(`SELECT COUNT(*) AS n FROM categories`).get() as { n: number }
    ).n;

    await expect(migrate(db)).resolves.not.toThrow();

    const secondVersion = db.pragma("user_version", { simple: true }) as number;
    const secondCategoryCount = (
      db.prepare(`SELECT COUNT(*) AS n FROM categories`).get() as { n: number }
    ).n;

    expect(secondVersion).toBe(firstVersion);
    expect(secondCategoryCount).toBe(firstCategoryCount);

    db.close();
  });
});

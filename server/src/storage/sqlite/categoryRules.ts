import type Database from "better-sqlite3";
import type { CategoryRulesRepo } from "../Storage.js";
import type { CategoryRule } from "../types.js";

interface CategoryRuleRow {
  counterparty_key: string;
  category: string;
  updated_at: string;
}

export function createSqliteCategoryRulesRepo(
  db: Database.Database
): CategoryRulesRepo {
  const selectAllStmt = db.prepare(
    `SELECT counterparty_key, category, updated_at FROM category_rules`
  );
  const upsertStmt = db.prepare(
    `INSERT INTO category_rules (counterparty_key, category, updated_at)
     VALUES (?, ?, ?)
     ON CONFLICT(counterparty_key) DO UPDATE SET
       category = excluded.category,
       updated_at = excluded.updated_at`
  );

  const selectDeclinedStmt = db.prepare(
    `SELECT name FROM declined_category_proposals ORDER BY rowid`
  );
  const declineStmt = db.prepare(
    `INSERT OR IGNORE INTO declined_category_proposals (name) VALUES (?)`
  );

  return {
    async findAll() {
      const rows = selectAllStmt.all() as CategoryRuleRow[];
      return rows.map(
        (row): CategoryRule => ({
          counterpartyKey: row.counterparty_key,
          category: row.category,
          updatedAt: row.updated_at,
        })
      );
    },

    async learn(rules) {
      if (rules.length === 0) return;
      const updatedAt = new Date().toISOString();
      db.transaction(() => {
        for (const rule of rules) {
          upsertStmt.run(rule.counterpartyKey, rule.category, updatedAt);
        }
      })();
    },

    async findDeclined() {
      const rows = selectDeclinedStmt.all() as Array<{ name: string }>;
      return rows.map((row) => row.name);
    },

    async decline(names) {
      if (names.length === 0) return;
      db.transaction(() => {
        for (const name of names) declineStmt.run(name);
      })();
    },
  };
}

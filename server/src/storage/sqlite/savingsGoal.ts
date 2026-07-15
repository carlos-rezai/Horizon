import type Database from "better-sqlite3";
import type { SavingsGoalRepo } from "../Storage.js";
import type { SavingsGoalConfig, SavingsGoalMode } from "../types.js";

interface SavingsGoalRow {
  mode: string;
  target_total: number;
  target_date: string;
  started_at: string;
  manual_monthly: string;
}

export function createSqliteSavingsGoalRepo(
  db: Database.Database
): SavingsGoalRepo {
  const selectStmt = db.prepare(
    `SELECT mode, target_total, target_date, started_at, manual_monthly
     FROM savings_goal WHERE id = 1`
  );
  // The single-row invariant lives in the schema (CHECK id = 1); upserting onto
  // id = 1 overwrites the one row rather than inserting a second.
  const upsertStmt = db.prepare(
    `INSERT INTO savings_goal
       (id, mode, target_total, target_date, started_at, manual_monthly)
     VALUES (1, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       mode = excluded.mode,
       target_total = excluded.target_total,
       target_date = excluded.target_date,
       started_at = excluded.started_at,
       manual_monthly = excluded.manual_monthly`
  );

  return {
    async get() {
      const row = selectStmt.get() as SavingsGoalRow | undefined;
      if (!row) return null;
      return {
        mode: row.mode as SavingsGoalMode,
        targetTotal: row.target_total,
        targetDate: row.target_date,
        startedAt: row.started_at,
        manualMonthly: JSON.parse(row.manual_monthly) as Record<string, number>,
      } satisfies SavingsGoalConfig;
    },

    async upsert(config) {
      upsertStmt.run(
        config.mode,
        config.targetTotal,
        config.targetDate,
        config.startedAt,
        JSON.stringify(config.manualMonthly)
      );
    },
  };
}

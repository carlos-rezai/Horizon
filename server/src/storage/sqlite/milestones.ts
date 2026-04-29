import { randomUUID } from "crypto";
import type Database from "better-sqlite3";
import type { MilestonesRepo } from "../Storage.js";
import type { Milestone } from "../types.js";
import { isValidUuid } from "./uuid.js";

interface MilestoneRow {
  id: string;
  name: string;
  account_id: string;
  target_balance: number;
}

function toMilestoneDTO(row: MilestoneRow): Milestone {
  return {
    id: row.id,
    name: row.name,
    accountId: row.account_id,
    targetBalance: row.target_balance,
  };
}

export function createSqliteMilestonesRepo(
  db: Database.Database
): MilestonesRepo {
  const selectAllStmt = db.prepare(`SELECT * FROM milestones`);
  const selectAccountStmt = db.prepare(`SELECT id FROM accounts WHERE id = ?`);
  const insertStmt = db.prepare(
    `INSERT INTO milestones (id, name, account_id, target_balance)
     VALUES (?, ?, ?, ?)`
  );
  const deleteStmt = db.prepare(`DELETE FROM milestones WHERE id = ?`);

  return {
    async findAll() {
      const rows = selectAllStmt.all() as MilestoneRow[];
      return rows.map(toMilestoneDTO);
    },

    async create(input) {
      if (!isValidUuid(input.accountId)) return null;
      const account = selectAccountStmt.get(input.accountId);
      if (!account) return null;
      const id = randomUUID();
      insertStmt.run(id, input.name, input.accountId, input.targetBalance);
      return {
        id,
        name: input.name,
        accountId: input.accountId,
        targetBalance: input.targetBalance,
      };
    },

    async delete(id) {
      if (!isValidUuid(id)) return false;
      const result = deleteStmt.run(id);
      return result.changes > 0;
    },
  };
}

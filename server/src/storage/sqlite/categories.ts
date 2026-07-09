import { randomUUID } from "crypto";
import type Database from "better-sqlite3";
import type { CategoriesRepo } from "../Storage.js";
import type { Category } from "../types.js";
import { colorForCategoryName } from "../categoryColors.js";
import { isValidUuid } from "./uuid.js";

interface CategoryRow {
  id: string;
  name: string;
  is_default: number;
  color: string | null;
  hidden: number;
}

function toCategoryDTO(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    isDefault: row.is_default === 1,
    color: row.color ?? colorForCategoryName(row.name),
    hidden: row.hidden === 1,
  };
}

export function createSqliteCategoriesRepo(
  db: Database.Database
): CategoriesRepo {
  const selectAllStmt = db.prepare(`SELECT * FROM categories`);
  const selectByIdStmt = db.prepare(`SELECT * FROM categories WHERE id = ?`);
  const insertStmt = db.prepare(
    `INSERT INTO categories (id, name, is_default, color) VALUES (?, ?, 0, ?)`
  );
  const collisionStmt = db.prepare(
    `SELECT 1 FROM categories WHERE lower(name) = lower(?) LIMIT 1`
  );
  const recolorStmt = db.prepare(
    `UPDATE categories SET color = ? WHERE id = ?`
  );
  const renameCollisionStmt = db.prepare(
    `SELECT 1 FROM categories WHERE lower(name) = lower(?) AND id != ? LIMIT 1`
  );
  const renameStmt = db.prepare(`UPDATE categories SET name = ? WHERE id = ?`);
  const cascadeTxStmt = db.prepare(
    `UPDATE transactions SET category = ? WHERE category = ?`
  );
  const cascadeRecurringStmt = db.prepare(
    `UPDATE recurring_transactions SET category = ? WHERE category = ?`
  );
  const renameCascade = db.transaction(
    (id: string, oldName: string, newName: string) => {
      renameStmt.run(newName, id);
      cascadeTxStmt.run(newName, oldName);
      cascadeRecurringStmt.run(newName, oldName);
    }
  );
  const deleteStmt = db.prepare(`DELETE FROM categories WHERE id = ?`);
  const checkInUseStmt = db.prepare(
    `SELECT 1 FROM transactions WHERE category = ? LIMIT 1`
  );

  return {
    async findAll() {
      const rows = selectAllStmt.all() as CategoryRow[];
      return rows.map(toCategoryDTO);
    },

    async create(input) {
      const name = input.name.trim().slice(0, 40);
      if (name.length === 0) return { ok: false, reason: "invalid_name" };
      if (collisionStmt.get(name)) return { ok: false, reason: "collision" };

      const id = randomUUID();
      const color = input.color ?? colorForCategoryName(name);
      insertStmt.run(id, name, color);
      return {
        ok: true,
        category: {
          id,
          name,
          isDefault: false,
          color,
          hidden: false,
        },
      };
    },

    async recolor(id, color) {
      if (!isValidUuid(id)) return null;
      const row = selectByIdStmt.get(id) as CategoryRow | undefined;
      if (!row) return null;
      recolorStmt.run(color, id);
      return toCategoryDTO({ ...row, color });
    },

    async rename(id, name) {
      if (!isValidUuid(id)) return null;
      const row = selectByIdStmt.get(id) as CategoryRow | undefined;
      if (!row) return null;
      if (row.is_default === 1) return { ok: false, reason: "is_default" };

      const trimmed = name.trim().slice(0, 40);
      if (trimmed.length === 0) return { ok: false, reason: "invalid_name" };
      if (renameCollisionStmt.get(trimmed, id)) {
        return { ok: false, reason: "collision" };
      }

      renameCascade(id, row.name, trimmed);
      return { ok: true, category: toCategoryDTO({ ...row, name: trimmed }) };
    },

    async delete(id) {
      if (!isValidUuid(id)) return null;
      const row = selectByIdStmt.get(id) as CategoryRow | undefined;
      if (!row) return null;
      if (row.is_default === 1) return { ok: false, reason: "is_default" };
      const inUse = checkInUseStmt.get(row.name);
      if (inUse) return { ok: false, reason: "in_use" };
      deleteStmt.run(id);
      return { ok: true };
    },
  };
}

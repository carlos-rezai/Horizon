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

  // Shared guard prelude for the mutation methods: reject a malformed id and
  // load the row, returning null when the id is invalid or unknown.
  function loadRow(id: string): CategoryRow | null {
    if (!isValidUuid(id)) return null;
    return (selectByIdStmt.get(id) as CategoryRow | undefined) ?? null;
  }

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
  const setHiddenStmt = db.prepare(
    `UPDATE categories SET hidden = ? WHERE id = ?`
  );
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
  // Reassign-on-delete: the same Category Reassignment primitive behind rename
  // (bulk-move transactions + recurring to the target name) then remove the
  // row, all in one transaction so no rows are ever orphaned.
  const reassignAndDelete = db.transaction(
    (id: string, oldName: string, newName: string) => {
      cascadeTxStmt.run(newName, oldName);
      cascadeRecurringStmt.run(newName, oldName);
      deleteStmt.run(id);
    }
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
      const row = loadRow(id);
      if (!row) return null;
      recolorStmt.run(color, id);
      return toCategoryDTO({ ...row, color });
    },

    async rename(id, name) {
      const row = loadRow(id);
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

    async setHidden(id, hidden) {
      const row = loadRow(id);
      if (!row) return null;
      // Hidden is a picker-visibility flag for defaults only; custom
      // categories are removed via delete, never hidden.
      if (row.is_default !== 1) return { ok: false, reason: "is_custom" };

      const nextHidden = hidden ? 1 : 0;
      setHiddenStmt.run(nextHidden, id);
      return {
        ok: true,
        category: toCategoryDTO({ ...row, hidden: nextHidden }),
      };
    },

    async delete(id, reassignTo) {
      const row = loadRow(id);
      if (!row) return null;
      if (row.is_default === 1) return { ok: false, reason: "is_default" };

      const target =
        reassignTo !== undefined && isValidUuid(reassignTo)
          ? (selectByIdStmt.get(reassignTo) as CategoryRow | undefined)
          : undefined;

      if (target) {
        reassignAndDelete(id, row.name, target.name);
        return { ok: true };
      }

      const inUse = checkInUseStmt.get(row.name);
      if (inUse) return { ok: false, reason: "in_use" };
      deleteStmt.run(id);
      return { ok: true };
    },
  };
}

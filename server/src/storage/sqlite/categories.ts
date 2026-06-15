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
}

function toCategoryDTO(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    isDefault: row.is_default === 1,
    color: row.color ?? colorForCategoryName(row.name),
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
      const id = randomUUID();
      const color = colorForCategoryName(input.name);
      insertStmt.run(id, input.name, color);
      return {
        id,
        name: input.name,
        isDefault: false,
        color,
      };
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

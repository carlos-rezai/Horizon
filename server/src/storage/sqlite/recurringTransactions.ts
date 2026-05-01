import { randomUUID } from "crypto";
import type Database from "better-sqlite3";
import type { RecurringTransactionsRepo } from "../Storage.js";
import type { Frequency, RecurringTransaction } from "../types.js";
import { isValidUuid } from "./uuid.js";

interface RecurringTransactionRow {
  id: string;
  account_id: string;
  amount: number;
  description: string;
  category: string;
  frequency: Frequency;
  day_of_month: number;
  is_active: number;
  linked_account_id: string | null;
  month_of_year: number | null;
}

function toDTO(row: RecurringTransactionRow): RecurringTransaction {
  const dto: RecurringTransaction = {
    id: row.id,
    accountId: row.account_id,
    amount: row.amount,
    description: row.description,
    category: row.category,
    frequency: row.frequency,
    dayOfMonth: row.day_of_month,
    isActive: row.is_active === 1,
  };
  if (row.linked_account_id !== null) {
    dto.linkedAccountId = row.linked_account_id;
  }
  if (row.month_of_year !== null) {
    dto.monthOfYear = row.month_of_year;
  }
  return dto;
}

export function createSqliteRecurringTransactionsRepo(
  db: Database.Database
): RecurringTransactionsRepo {
  const selectAllStmt = db.prepare(`SELECT * FROM recurring_transactions`);
  const selectActiveStmt = db.prepare(
    `SELECT * FROM recurring_transactions WHERE is_active = 1`
  );
  const selectByIdStmt = db.prepare(
    `SELECT * FROM recurring_transactions WHERE id = ?`
  );
  const selectAccountByIdStmt = db.prepare(
    `SELECT id FROM accounts WHERE id = ?`
  );
  const insertStmt = db.prepare(
    `INSERT INTO recurring_transactions
       (id, account_id, amount, description, category, frequency,
        day_of_month, is_active, linked_account_id, month_of_year)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`
  );
  const updateStmt = db.prepare(
    `UPDATE recurring_transactions
       SET amount = COALESCE(?, amount),
           description = COALESCE(?, description),
           category = COALESCE(?, category),
           is_active = COALESCE(?, is_active),
           frequency = COALESCE(?, frequency),
           day_of_month = COALESCE(?, day_of_month),
           linked_account_id = COALESCE(?, linked_account_id),
           month_of_year = COALESCE(?, month_of_year)
     WHERE id = ?`
  );
  const deleteStmt = db.prepare(
    `DELETE FROM recurring_transactions WHERE id = ?`
  );

  return {
    async findAll() {
      const rows = selectAllStmt.all() as RecurringTransactionRow[];
      return rows.map(toDTO);
    },

    async findActive() {
      const rows = selectActiveStmt.all() as RecurringTransactionRow[];
      return rows.map(toDTO);
    },

    async create(input) {
      if (!isValidUuid(input.accountId)) return null;
      if (!selectAccountByIdStmt.get(input.accountId)) return null;
      if (input.linkedAccountId !== undefined) {
        if (!isValidUuid(input.linkedAccountId)) return null;
        if (!selectAccountByIdStmt.get(input.linkedAccountId)) return null;
      }
      const id = randomUUID();
      insertStmt.run(
        id,
        input.accountId,
        input.amount,
        input.description,
        input.category,
        input.frequency,
        input.dayOfMonth,
        input.linkedAccountId ?? null,
        input.monthOfYear ?? null
      );
      const dto: RecurringTransaction = {
        id,
        accountId: input.accountId,
        amount: input.amount,
        description: input.description,
        category: input.category,
        frequency: input.frequency,
        dayOfMonth: input.dayOfMonth,
        isActive: true,
      };
      if (input.linkedAccountId !== undefined) {
        dto.linkedAccountId = input.linkedAccountId;
      }
      if (input.monthOfYear !== undefined) {
        dto.monthOfYear = input.monthOfYear;
      }
      return dto;
    },

    async update(id, input) {
      if (!isValidUuid(id)) return null;
      const existing = selectByIdStmt.get(id) as
        | RecurringTransactionRow
        | undefined;
      if (!existing) return null;
      const isActiveBinding =
        input.isActive === undefined ? null : input.isActive ? 1 : 0;
      updateStmt.run(
        input.amount ?? null,
        input.description ?? null,
        input.category ?? null,
        isActiveBinding,
        input.frequency ?? null,
        input.dayOfMonth ?? null,
        input.linkedAccountId ?? null,
        input.monthOfYear ?? null,
        id
      );
      const updated = selectByIdStmt.get(id) as RecurringTransactionRow;
      return toDTO(updated);
    },

    async delete(id) {
      if (!isValidUuid(id)) return false;
      const result = deleteStmt.run(id);
      return result.changes > 0;
    },
  };
}

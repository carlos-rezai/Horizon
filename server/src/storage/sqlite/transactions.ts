import { randomUUID } from "crypto";
import type Database from "better-sqlite3";
import type { TransactionsRepo } from "../Storage.js";
import type { Transaction } from "../types.js";
import { isValidUuid } from "./uuid.js";

export interface TransactionRow {
  id: string;
  account_id: string;
  date: string;
  amount: number;
  description: string;
  category: string;
  transfer_id: string | null;
  recurring_transaction_id: string | null;
  is_auto_settlement: number;
  import_id: string | null;
}

export function toTransactionDTO(row: TransactionRow): Transaction {
  const dto: Transaction = {
    id: row.id,
    accountId: row.account_id,
    date: row.date,
    amount: row.amount,
    description: row.description,
    category: row.category,
  };
  if (row.transfer_id !== null) dto.transferId = row.transfer_id;
  if (row.recurring_transaction_id !== null) {
    dto.recurringTransactionId = row.recurring_transaction_id;
  }
  if (row.is_auto_settlement === 1) dto.isAutoSettlement = true;
  if (row.import_id !== null) dto.importId = row.import_id;
  return dto;
}

function nextMonthStart(month: string): string {
  const [yearStr, monthStr] = month.split("-");
  const year = Number(yearStr);
  const m = Number(monthStr);
  const nextYear = m === 12 ? year + 1 : year;
  const nextMonth = m === 12 ? 1 : m + 1;
  return `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;
}

export function createSqliteTransactionsRepo(
  db: Database.Database
): TransactionsRepo {
  const selectAllStmt = db.prepare(
    `SELECT * FROM transactions ORDER BY date DESC`
  );
  const selectByAccountStmt = db.prepare(
    `SELECT * FROM transactions WHERE account_id = ? ORDER BY date DESC`
  );
  const selectByAccountAndMonthStmt = db.prepare(
    `SELECT * FROM transactions
       WHERE account_id = ? AND date >= ? AND date < ?
     ORDER BY date DESC`
  );
  const selectByTransferStmt = db.prepare(
    `SELECT * FROM transactions WHERE transfer_id = ?`
  );
  const selectByIdStmt = db.prepare(`SELECT * FROM transactions WHERE id = ?`);
  const selectAccountByIdStmt = db.prepare(
    `SELECT id FROM accounts WHERE id = ?`
  );
  const insertStmt = db.prepare(
    `INSERT INTO transactions
       (id, account_id, date, amount, description, category,
        transfer_id, recurring_transaction_id)
     VALUES (?, ?, ?, ?, ?, ?, NULL, NULL)`
  );
  const updateStmt = db.prepare(
    `UPDATE transactions
       SET amount = COALESCE(?, amount),
           description = COALESCE(?, description),
           category = COALESCE(?, category),
           date = COALESCE(?, date)
     WHERE id = ?`
  );
  const deleteStmt = db.prepare(`DELETE FROM transactions WHERE id = ?`);

  return {
    async findAll() {
      const rows = selectAllStmt.all() as TransactionRow[];
      return rows.map(toTransactionDTO);
    },

    async findById(id) {
      if (!isValidUuid(id)) return null;
      const row = selectByIdStmt.get(id) as TransactionRow | undefined;
      return row ? toTransactionDTO(row) : null;
    },

    async findByAccount(accountId, opts) {
      if (!isValidUuid(accountId)) return [];
      let rows: TransactionRow[];
      if (opts?.month) {
        rows = selectByAccountAndMonthStmt.all(
          accountId,
          `${opts.month}-01`,
          nextMonthStart(opts.month)
        ) as TransactionRow[];
      } else {
        rows = selectByAccountStmt.all(accountId) as TransactionRow[];
      }
      return rows.map(toTransactionDTO);
    },

    async findByTransferId(transferId) {
      const rows = selectByTransferStmt.all(transferId) as TransactionRow[];
      return rows.map(toTransactionDTO);
    },

    async create(accountId, input) {
      if (!isValidUuid(accountId)) return null;
      const account = selectAccountByIdStmt.get(accountId);
      if (!account) return null;
      const id = randomUUID();
      insertStmt.run(
        id,
        accountId,
        input.date,
        input.amount,
        input.description,
        input.category
      );
      return {
        id,
        accountId,
        date: input.date,
        amount: input.amount,
        description: input.description,
        category: input.category,
      };
    },

    async update(id, input) {
      if (!isValidUuid(id)) return null;
      const existing = selectByIdStmt.get(id) as TransactionRow | undefined;
      if (!existing) return null;
      updateStmt.run(
        input.amount ?? null,
        input.description ?? null,
        input.category ?? null,
        input.date ?? null,
        id
      );
      const updated = selectByIdStmt.get(id) as TransactionRow;
      return toTransactionDTO(updated);
    },

    async delete(id) {
      if (!isValidUuid(id)) return null;
      const existing = selectByIdStmt.get(id) as TransactionRow | undefined;
      if (!existing) return null;
      if (existing.transfer_id !== null) {
        return { ok: false, reason: "is_transfer_leg" };
      }
      deleteStmt.run(id);
      return { ok: true };
    },
  };
}

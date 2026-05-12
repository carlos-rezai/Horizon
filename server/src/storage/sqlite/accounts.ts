import { randomUUID } from "crypto";
import type Database from "better-sqlite3";
import type { AccountsRepo, TransactionsRepo } from "../Storage.js";
import type { Account, AccountKind, AccountWithBalance } from "../types.js";
import { isValidUuid } from "./uuid.js";

interface AccountRow {
  id: string;
  kind: AccountKind;
  name: string;
  opening_balance: number;
  opening_date: string;
  sondertilgung_allowance: number | null;
}

interface AccountWithBalanceRow extends AccountRow {
  balance: number;
}

function toAccountDTO(row: AccountRow): Account {
  const dto: Account = {
    id: row.id,
    kind: row.kind,
    name: row.name,
    openingBalance: row.opening_balance,
    openingDate: row.opening_date,
  };
  if (row.sondertilgung_allowance !== null) {
    dto.sondertilgungAllowance = row.sondertilgung_allowance;
  }
  return dto;
}

function toAccountWithBalanceDTO(
  row: AccountWithBalanceRow
): AccountWithBalance {
  return { ...toAccountDTO(row), balance: row.balance };
}

export function createSqliteAccountsRepo(
  db: Database.Database,
  transactions: TransactionsRepo
): AccountsRepo {
  const insertStmt = db.prepare(
    `INSERT INTO accounts
       (id, kind, name, opening_balance, opening_date, sondertilgung_allowance)
     VALUES (?, ?, ?, ?, ?, ?)`
  );
  const selectAllStmt = db.prepare(`SELECT * FROM accounts`);
  const selectByIdStmt = db.prepare(`SELECT * FROM accounts WHERE id = ?`);
  const updateStmt = db.prepare(
    `UPDATE accounts
       SET name = COALESCE(?, name),
           opening_balance = COALESCE(?, opening_balance),
           sondertilgung_allowance = COALESCE(?, sondertilgung_allowance)
     WHERE id = ?`
  );
  const deleteStmt = db.prepare(`DELETE FROM accounts WHERE id = ?`);
  const countRecurringByAccountStmt = db.prepare(
    `SELECT COUNT(*) AS n FROM recurring_transactions
       WHERE account_id = ? OR linked_account_id = ?`
  );
  const selectAllWithBalanceStmt = db.prepare(
    `SELECT a.id, a.kind, a.name, a.opening_balance, a.opening_date,
            a.sondertilgung_allowance,
            a.opening_balance + COALESCE(SUM(t.amount), 0) AS balance
       FROM accounts a
       LEFT JOIN transactions t ON t.account_id = a.id
      GROUP BY a.id`
  );
  const selectByIdWithBalanceStmt = db.prepare(
    `SELECT a.id, a.kind, a.name, a.opening_balance, a.opening_date,
            a.sondertilgung_allowance,
            a.opening_balance + COALESCE(SUM(t.amount), 0) AS balance
       FROM accounts a
       LEFT JOIN transactions t ON t.account_id = a.id
      WHERE a.id = ?
      GROUP BY a.id`
  );
  const totalLiquidStmt = db.prepare(
    `SELECT COALESCE(SUM(balance), 0) AS total FROM (
       SELECT a.opening_balance + COALESCE(SUM(t.amount), 0) AS balance
         FROM accounts a
         LEFT JOIN transactions t ON t.account_id = a.id
        WHERE a.kind IN ('Girokonto', 'Tagesgeld')
        GROUP BY a.id
     )`
  );

  return {
    async create(input) {
      const id = randomUUID();
      insertStmt.run(
        id,
        input.kind,
        input.name,
        input.openingBalance,
        input.openingDate,
        input.sondertilgungAllowance ?? null
      );
      const dto: Account = {
        id,
        kind: input.kind,
        name: input.name,
        openingBalance: input.openingBalance,
        openingDate: input.openingDate,
      };
      if (input.sondertilgungAllowance !== undefined) {
        dto.sondertilgungAllowance = input.sondertilgungAllowance;
      }
      return dto;
    },

    async findAll() {
      const rows = selectAllStmt.all() as AccountRow[];
      return rows.map(toAccountDTO);
    },

    async findById(id) {
      if (!isValidUuid(id)) return null;
      const row = selectByIdStmt.get(id) as AccountRow | undefined;
      return row ? toAccountDTO(row) : null;
    },

    async update(id, input) {
      if (!isValidUuid(id)) return null;
      const existing = selectByIdStmt.get(id) as AccountRow | undefined;
      if (!existing) return null;
      updateStmt.run(
        input.name ?? null,
        input.openingBalance ?? null,
        input.sondertilgungAllowance ?? null,
        id
      );
      const updated = selectByIdStmt.get(id) as AccountRow;
      return toAccountDTO(updated);
    },

    async delete(id) {
      if (!isValidUuid(id)) return null;
      const existing = selectByIdStmt.get(id) as AccountRow | undefined;
      if (!existing) return null;
      const txs = await transactions.findByAccount(id);
      if (txs.length > 0) return { ok: false, reason: "has_transactions" };
      const recurringCount = (
        countRecurringByAccountStmt.get(id, id) as { n: number }
      ).n;
      if (recurringCount > 0) return { ok: false, reason: "in_use" };
      deleteStmt.run(id);
      return { ok: true };
    },

    async findAllWithBalance() {
      const rows = selectAllWithBalanceStmt.all() as AccountWithBalanceRow[];
      return rows.map(toAccountWithBalanceDTO);
    },

    async findByIdWithBalance(id) {
      if (!isValidUuid(id)) return null;
      const row = selectByIdWithBalanceStmt.get(id) as
        | AccountWithBalanceRow
        | undefined;
      return row ? toAccountWithBalanceDTO(row) : null;
    },

    async getTotalLiquid() {
      const result = totalLiquidStmt.get() as { total: number };
      return result.total;
    },
  };
}

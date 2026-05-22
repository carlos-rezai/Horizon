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
  icon: string | null;
  color: string | null;
  linked_account_id: string | null;
  settlement_day: number | null;
  linked_since: string | null;
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
    icon: row.icon,
    color: row.color,
    linkedAccountId: row.linked_account_id ?? null,
    settlementDay: row.settlement_day ?? null,
    linkedSince: row.linked_since ?? null,
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
       (id, kind, name, opening_balance, opening_date, sondertilgung_allowance, icon, color,
        linked_account_id, settlement_day, linked_since)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const selectAllStmt = db.prepare(`SELECT * FROM accounts`);
  const selectByIdStmt = db.prepare(`SELECT * FROM accounts WHERE id = ?`);
  const updateStmt = db.prepare(
    `UPDATE accounts
       SET name = COALESCE(?, name),
           opening_balance = COALESCE(?, opening_balance),
           sondertilgung_allowance = COALESCE(?, sondertilgung_allowance),
           icon = ?,
           color = ?,
           linked_account_id = ?,
           settlement_day = ?,
           linked_since = ?
     WHERE id = ?`
  );
  const deleteStmt = db.prepare(`DELETE FROM accounts WHERE id = ?`);
  const countRecurringByAccountStmt = db.prepare(
    `SELECT COUNT(*) AS n FROM recurring_transactions
       WHERE account_id = ? OR linked_account_id = ?`
  );
  const selectAllWithBalanceStmt = db.prepare(
    `SELECT a.id, a.kind, a.name, a.opening_balance, a.opening_date,
            a.sondertilgung_allowance, a.icon, a.color,
            a.linked_account_id, a.settlement_day, a.linked_since,
            a.opening_balance + COALESCE(SUM(t.amount), 0) AS balance
       FROM accounts a
       LEFT JOIN transactions t ON t.account_id = a.id
      GROUP BY a.id`
  );
  const selectByIdWithBalanceStmt = db.prepare(
    `SELECT a.id, a.kind, a.name, a.opening_balance, a.opening_date,
            a.sondertilgung_allowance, a.icon, a.color,
            a.linked_account_id, a.settlement_day, a.linked_since,
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
      const linkedSince =
        input.linkedAccountId != null ? input.openingDate : null;
      insertStmt.run(
        id,
        input.kind,
        input.name,
        input.openingBalance,
        input.openingDate,
        input.sondertilgungAllowance ?? null,
        input.icon ?? null,
        input.color ?? null,
        input.linkedAccountId ?? null,
        input.settlementDay ?? null,
        linkedSince
      );
      const dto: Account = {
        id,
        kind: input.kind,
        name: input.name,
        openingBalance: input.openingBalance,
        openingDate: input.openingDate,
        icon: input.icon ?? null,
        color: input.color ?? null,
        linkedAccountId: input.linkedAccountId ?? null,
        settlementDay: input.settlementDay ?? null,
        linkedSince,
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

      const today = new Date().toISOString().slice(0, 10);
      const unlinking =
        "linkedAccountId" in input && input.linkedAccountId === null;

      let newLinkedAccountId: string | null;
      let newSettlementDay: number | null;
      let newLinkedSince: string | null;

      if (unlinking) {
        newLinkedAccountId = null;
        newSettlementDay = null;
        newLinkedSince = null;
      } else {
        const linkedAccountChanged =
          "linkedAccountId" in input &&
          input.linkedAccountId !== undefined &&
          input.linkedAccountId !== existing.linked_account_id;
        const settlementDayChanged =
          "settlementDay" in input &&
          input.settlementDay !== undefined &&
          input.settlementDay !== existing.settlement_day;

        newLinkedAccountId =
          "linkedAccountId" in input && input.linkedAccountId !== undefined
            ? input.linkedAccountId
            : existing.linked_account_id;
        newSettlementDay =
          "settlementDay" in input && input.settlementDay !== undefined
            ? input.settlementDay
            : existing.settlement_day;
        newLinkedSince =
          linkedAccountChanged || settlementDayChanged
            ? today
            : existing.linked_since;
      }

      updateStmt.run(
        input.name ?? null,
        input.openingBalance ?? null,
        input.sondertilgungAllowance ?? null,
        "icon" in input ? (input.icon ?? null) : existing.icon,
        "color" in input ? (input.color ?? null) : existing.color,
        newLinkedAccountId,
        newSettlementDay,
        newLinkedSince,
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

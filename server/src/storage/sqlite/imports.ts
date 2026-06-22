import { randomUUID } from "crypto";
import type Database from "better-sqlite3";
import type { ImportPresetsRepo, ImportsRepo } from "../Storage.js";
import type { ColumnMapping, ImportRecord } from "../types.js";
import { isValidUuid } from "./uuid.js";
import { toTransactionDTO, type TransactionRow } from "./transactions.js";

interface ImportRow {
  id: string;
  account_id: string;
  bank: string;
  filename: string;
  size_bytes: number;
  row_count: number;
  start_date: string;
  end_date: string;
  imported_at: string;
}

function toImportDTO(row: ImportRow): ImportRecord {
  return {
    id: row.id,
    accountId: row.account_id,
    bank: row.bank,
    filename: row.filename,
    sizeBytes: row.size_bytes,
    rowCount: row.row_count,
    startDate: row.start_date,
    endDate: row.end_date,
    importedAt: row.imported_at,
  };
}

export function createSqliteImportsRepo(db: Database.Database): ImportsRepo {
  const selectAccountByIdStmt = db.prepare(
    `SELECT id FROM accounts WHERE id = ?`
  );
  const insertImportStmt = db.prepare(
    `INSERT INTO imports
       (id, account_id, bank, filename, size_bytes, row_count,
        start_date, end_date, imported_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const insertTxStmt = db.prepare(
    `INSERT INTO transactions
       (id, account_id, date, amount, description, category,
        transfer_id, recurring_transaction_id, is_auto_settlement, import_id)
     VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, 0, ?)`
  );
  const selectAllStmt = db.prepare(
    `SELECT * FROM imports ORDER BY imported_at DESC`
  );
  const selectByAccountStmt = db.prepare(
    `SELECT * FROM imports WHERE account_id = ? ORDER BY imported_at DESC`
  );
  const selectByIdStmt = db.prepare(`SELECT * FROM imports WHERE id = ?`);
  const selectTransactionsStmt = db.prepare(
    `SELECT * FROM transactions WHERE import_id = ? ORDER BY date DESC`
  );
  const deleteTransactionsStmt = db.prepare(
    `DELETE FROM transactions WHERE import_id = ?`
  );
  const deleteImportStmt = db.prepare(`DELETE FROM imports WHERE id = ?`);

  return {
    async create(input) {
      if (!isValidUuid(input.accountId)) return null;
      const account = selectAccountByIdStmt.get(input.accountId);
      if (!account) return null;

      const dates = input.rows.map((r) => r.date).sort();
      const id = randomUUID();
      const importedAt = new Date().toISOString();
      const record: ImportRow = {
        id,
        account_id: input.accountId,
        bank: input.bank,
        filename: input.filename,
        size_bytes: input.sizeBytes,
        row_count: input.rows.length,
        start_date: dates[0] ?? "",
        end_date: dates[dates.length - 1] ?? "",
        imported_at: importedAt,
      };

      const apply = db.transaction(() => {
        insertImportStmt.run(
          record.id,
          record.account_id,
          record.bank,
          record.filename,
          record.size_bytes,
          record.row_count,
          record.start_date,
          record.end_date,
          record.imported_at
        );
        for (const row of input.rows) {
          insertTxStmt.run(
            randomUUID(),
            input.accountId,
            row.date,
            row.amount,
            row.description,
            row.category,
            id
          );
        }
      });
      apply();

      return toImportDTO(record);
    },

    async findAll() {
      const rows = selectAllStmt.all() as ImportRow[];
      return rows.map(toImportDTO);
    },

    async findByAccount(accountId) {
      if (!isValidUuid(accountId)) return [];
      const rows = selectByAccountStmt.all(accountId) as ImportRow[];
      return rows.map(toImportDTO);
    },

    async findTransactions(importId) {
      const rows = selectTransactionsStmt.all(importId) as TransactionRow[];
      return rows.map(toTransactionDTO);
    },

    async delete(importId) {
      const existing = selectByIdStmt.get(importId) as ImportRow | undefined;
      if (!existing) return false;
      const apply = db.transaction(() => {
        deleteTransactionsStmt.run(importId);
        deleteImportStmt.run(importId);
      });
      apply();
      return true;
    },
  };
}

export function createSqliteImportPresetsRepo(
  db: Database.Database
): ImportPresetsRepo {
  const selectStmt = db.prepare(
    `SELECT mapping FROM import_presets WHERE bank = ?`
  );
  const upsertStmt = db.prepare(
    `INSERT INTO import_presets (bank, mapping)
     VALUES (?, ?)
     ON CONFLICT(bank) DO UPDATE SET mapping = excluded.mapping`
  );

  return {
    async get(bank) {
      const row = selectStmt.get(bank) as { mapping: string } | undefined;
      if (!row) return null;
      return JSON.parse(row.mapping) as ColumnMapping;
    },

    async upsert(bank, mapping) {
      upsertStmt.run(bank, JSON.stringify(mapping));
    },
  };
}

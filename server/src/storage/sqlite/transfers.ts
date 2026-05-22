import { randomUUID } from "crypto";
import type Database from "better-sqlite3";
import type { TransfersRepo } from "../Storage.js";
import type { TransferCreateInput } from "../types.js";
import { isValidUuid } from "./uuid.js";

export function createSqliteTransfersRepo(
  db: Database.Database
): TransfersRepo {
  const selectAccountStmt = db.prepare(`SELECT id FROM accounts WHERE id = ?`);
  const insertTxStmt = db.prepare(
    `INSERT INTO transactions
       (id, account_id, date, amount, description, category,
        transfer_id, recurring_transaction_id, is_auto_settlement)
     VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?)`
  );
  const deleteByTransferStmt = db.prepare(
    `DELETE FROM transactions WHERE transfer_id = ?`
  );

  return {
    async create(input: TransferCreateInput) {
      if (
        !isValidUuid(input.fromAccountId) ||
        !isValidUuid(input.toAccountId)
      ) {
        return null;
      }
      const from = selectAccountStmt.get(input.fromAccountId);
      const to = selectAccountStmt.get(input.toAccountId);
      if (!from || !to) return null;

      const transferId = randomUUID();
      const autoSettlement = input.isAutoSettlement ? 1 : 0;
      const apply = db.transaction(() => {
        insertTxStmt.run(
          randomUUID(),
          input.fromAccountId,
          input.date,
          -input.amount,
          input.description,
          input.category,
          transferId,
          autoSettlement
        );
        insertTxStmt.run(
          randomUUID(),
          input.toAccountId,
          input.date,
          input.amount,
          input.description,
          input.category,
          transferId,
          autoSettlement
        );
      });
      apply();
      return { transferId };
    },

    async delete(transferId: string) {
      const result = deleteByTransferStmt.run(transferId);
      return result.changes > 0;
    },
  };
}

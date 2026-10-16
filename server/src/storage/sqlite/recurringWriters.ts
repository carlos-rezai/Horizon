import type Database from "better-sqlite3";
import type { RecurringTransactionCreateInput } from "../types.js";

/**
 * The synchronous recurring write, shared by the recurring repo and any
 * transaction that writes recurrings alongside other rows (Mortgage Setup's
 * Repayment Transfers). It only writes: the id and account existence checks
 * stay in the repo's async `create`, where the routes rely on them.
 */
export interface RecurringWriters {
  insert(id: string, input: RecurringTransactionCreateInput): void;
}

const writersByDb = new WeakMap<Database.Database, RecurringWriters>();

/** The recurring writers for `db`, prepared once per database. */
export function recurringWriters(db: Database.Database): RecurringWriters {
  const cached = writersByDb.get(db);
  if (cached) return cached;

  const insertStmt = db.prepare(
    `INSERT INTO recurring_transactions
       (id, account_id, amount, description, category, frequency,
        day_of_month, linked_account_id, month_of_year)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  const writers: RecurringWriters = {
    insert(id, input) {
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
    },
  };
  writersByDb.set(db, writers);
  return writers;
}

import type Database from "better-sqlite3";
import type { AccountCreateInput, MortgageOriginationInput } from "../types.js";

/**
 * The synchronous account writes, shared by the accounts repo and any
 * transaction that creates an account alongside other rows (Mortgage Setup).
 * A better-sqlite3 transaction cannot await, so it calls these instead of the
 * async repo methods. They only write: validation stays with the callers.
 */
export interface AccountWriters {
  /**
   * Insert an account at the end of the user's sort order. Answers the
   * derived fields the caller needs for its DTO.
   */
  insert(
    id: string,
    input: AccountCreateInput
  ): { linkedSince: string | null; showInTrajectory: boolean };
  /** Write a Mortgage's origination onto its account. */
  setOrigination(id: string, origination: MortgageOriginationInput): void;
}

const writersByDb = new WeakMap<Database.Database, AccountWriters>();

/** The account writers for `db`, prepared once per database. */
export function accountWriters(db: Database.Database): AccountWriters {
  const cached = writersByDb.get(db);
  if (cached) return cached;

  const insertStmt = db.prepare(
    `INSERT INTO accounts
       (id, kind, name, anchor_balance, anchor_date, sondertilgung_allowance, icon, color,
        linked_account_id, settlement_day, linked_since, show_in_trajectory, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const nextSortOrderStmt = db.prepare(
    `SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM accounts`
  );
  const setOriginationStmt = db.prepare(
    `UPDATE accounts
       SET original_principal = ?, start_date = ?, term_years = ?
     WHERE id = ?`
  );

  const writers: AccountWriters = {
    insert(id, input) {
      const linkedSince =
        input.linkedAccountId != null ? input.anchorDate : null;
      const showInTrajectory = input.showInTrajectory ?? true;
      const nextSortOrder = (nextSortOrderStmt.get() as { next: number }).next;
      insertStmt.run(
        id,
        input.kind,
        input.name,
        input.anchorBalance,
        input.anchorDate,
        input.sondertilgungAllowance ?? null,
        input.icon ?? null,
        input.color ?? null,
        input.linkedAccountId ?? null,
        input.settlementDay ?? null,
        linkedSince,
        showInTrajectory ? 1 : 0,
        nextSortOrder
      );
      return { linkedSince, showInTrajectory };
    },

    setOrigination(id, origination) {
      setOriginationStmt.run(
        origination.originalPrincipal,
        origination.startDate,
        origination.termYears,
        id
      );
    },
  };
  writersByDb.set(db, writers);
  return writers;
}

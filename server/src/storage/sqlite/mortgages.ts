import { randomUUID } from "crypto";
import type Database from "better-sqlite3";
import type { AccountsRepo, MortgagesRepo } from "../Storage.js";
import type { MortgageSetup } from "../types.js";
import { categoryColorPalette } from "../categoryColors.js";

function randomPaletteColor(): string {
  return categoryColorPalette[
    Math.floor(Math.random() * categoryColorPalette.length)
  ];
}

export function createSqliteMortgagesRepo(
  db: Database.Database,
  accounts: AccountsRepo
): MortgagesRepo {
  const nextSortOrderStmt = db.prepare(
    `SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM accounts`
  );
  const insertAccountStmt = db.prepare(
    `INSERT INTO accounts
       (id, kind, name, opening_balance, opening_date, icon, color,
        show_in_trajectory, sort_order)
     VALUES (?, 'Mortgage', ?, ?, ?, NULL, ?, 1, ?)`
  );
  const setOriginationStmt = db.prepare(
    `UPDATE accounts
       SET original_principal = ?, start_date = ?, term_years = ?
     WHERE id = ?`
  );

  const insertRecurringStmt = db.prepare(
    `INSERT INTO recurring_transactions
       (id, account_id, amount, description, category, frequency,
        day_of_month, linked_account_id, month_of_year)
     VALUES (?, ?, ?, ?, 'Transfer', ?, ?, ?, ?)`
  );

  const createInTransaction = db.transaction(
    (id: string, setup: MortgageSetup): void => {
      const nextSortOrder = (nextSortOrderStmt.get() as { next: number }).next;
      insertAccountStmt.run(
        id,
        setup.name,
        setup.openingBalance,
        setup.openingDate,
        randomPaletteColor(),
        nextSortOrder
      );
      setOriginationStmt.run(
        setup.originalPrincipal,
        setup.startDate,
        setup.termYears,
        id
      );
      const repayment = setup.repayment;
      if (repayment) {
        insertRecurringStmt.run(
          randomUUID(),
          repayment.fundingAccountId,
          repayment.monthlyAmount,
          "Mortgage repayment",
          "monthly",
          repayment.dayOfMonth,
          id,
          null
        );
        if (
          repayment.sondertilgungAmount !== undefined &&
          repayment.sondertilgungMonth !== undefined
        ) {
          insertRecurringStmt.run(
            randomUUID(),
            repayment.fundingAccountId,
            repayment.sondertilgungAmount,
            "Sondertilgung",
            "annual",
            repayment.dayOfMonth,
            id,
            repayment.sondertilgungMonth
          );
        }
      }
    }
  );

  return {
    async create(setup) {
      const id = randomUUID();
      createInTransaction(id, setup);
      const created = await accounts.findByIdWithBalance(id);
      if (!created) {
        throw new Error("Mortgage account missing after create");
      }
      return created;
    },
  };
}

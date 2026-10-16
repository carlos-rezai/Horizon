import { randomUUID } from "crypto";
import type Database from "better-sqlite3";
import type { AccountsRepo, MortgagesRepo } from "../Storage.js";
import type { MortgageSetup } from "../types.js";
import { accountWriters } from "./accountWriters.js";
import { recurringWriters } from "./recurringWriters.js";

export function createSqliteMortgagesRepo(
  db: Database.Database,
  accounts: AccountsRepo
): MortgagesRepo {
  const accountWriter = accountWriters(db);
  const recurringWriter = recurringWriters(db);

  const createInTransaction = db.transaction(
    (id: string, setup: MortgageSetup): void => {
      accountWriter.insert(id, {
        kind: "Mortgage",
        name: setup.name,
        openingBalance: setup.openingBalance,
        openingDate: setup.openingDate,
        color: setup.color,
      });
      accountWriter.setOrigination(id, {
        originalPrincipal: setup.originalPrincipal,
        startDate: setup.startDate,
        termYears: setup.termYears,
      });
      const repayment = setup.repayment;
      if (repayment) {
        recurringWriter.insert(randomUUID(), {
          accountId: repayment.paidFromAccountId,
          amount: repayment.monthlyAmount,
          description: "Mortgage repayment",
          category: "Transfer",
          frequency: "monthly",
          dayOfMonth: repayment.dayOfMonth,
          linkedAccountId: id,
        });
        if (
          repayment.sondertilgungAmount !== undefined &&
          repayment.sondertilgungMonth !== undefined
        ) {
          recurringWriter.insert(randomUUID(), {
            accountId: repayment.paidFromAccountId,
            amount: repayment.sondertilgungAmount,
            description: "Sondertilgung",
            category: "Transfer",
            frequency: "annual",
            dayOfMonth: repayment.dayOfMonth,
            linkedAccountId: id,
            monthOfYear: repayment.sondertilgungMonth,
          });
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

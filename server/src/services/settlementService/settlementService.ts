import type { Storage } from "../../storage/Storage.js";
import { computeMissingSettlements } from "../../lib/settlement/settlement.js";
import { todayIso } from "../../lib/date/date.js";

export async function generateSettlements(storage: Storage): Promise<number> {
  const [accounts, transactions, recurrings] = await Promise.all([
    storage.accounts.findAll(),
    storage.transactions.findAll(),
    storage.recurringTransactions.findActive(),
  ]);

  const inputs = computeMissingSettlements(
    accounts,
    transactions,
    todayIso(),
    recurrings
  );

  let count = 0;
  for (const input of inputs) {
    const result = await storage.transfers.create(input);
    if (result) count++;
  }
  return count;
}

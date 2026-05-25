import type { Storage } from "../../storage/Storage.js";
import { computeMissingSettlements } from "../../lib/settlement/settlement.js";

export async function generateSettlements(storage: Storage): Promise<number> {
  const [accounts, transactions] = await Promise.all([
    storage.accounts.findAll(),
    storage.transactions.findAll(),
  ]);

  const asOf = new Date().toISOString().slice(0, 10);
  const inputs = computeMissingSettlements(accounts, transactions, asOf);

  let count = 0;
  for (const input of inputs) {
    const result = await storage.transfers.create(input);
    if (result) count++;
  }
  return count;
}

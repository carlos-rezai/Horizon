import type { Storage } from "../../storage/Storage.js";
import type {
  Account,
  AccountWithBalance,
  AccountWithRecordedBalance,
  RecurringTransaction,
} from "../../storage/types.js";
import { recurringHistory } from "../../lib/recurringHistory/recurringHistory.js";
import { selectLiquidAccounts } from "../../lib/accountKinds/accountKinds.js";
import { todayIso } from "../../lib/date/date.js";

// Current Balance = Recorded Balance + Recurring History through today.
function withCurrentBalance(
  account: AccountWithRecordedBalance,
  accounts: Account[],
  recurrings: RecurringTransaction[],
  today: string
): AccountWithBalance {
  const { recordedBalance, ...rest } = account;
  return {
    ...rest,
    balance:
      recordedBalance +
      recurringHistory(account.id, accounts, recurrings, today),
  };
}

export async function findAllWithBalance(
  storage: Storage
): Promise<AccountWithBalance[]> {
  const [recorded, recurrings] = await Promise.all([
    storage.accounts.findAllWithRecordedBalance(),
    storage.recurringTransactions.findActive(),
  ]);
  const today = todayIso();
  return recorded.map((a) =>
    withCurrentBalance(a, recorded, recurrings, today)
  );
}

export async function findByIdWithBalance(
  storage: Storage,
  id: string
): Promise<AccountWithBalance | null> {
  const recorded = await storage.accounts.findByIdWithRecordedBalance(id);
  if (!recorded) return null;
  const [accounts, recurrings] = await Promise.all([
    storage.accounts.findAll(),
    storage.recurringTransactions.findActive(),
  ]);
  return withCurrentBalance(recorded, accounts, recurrings, todayIso());
}

export async function getTotalLiquid(storage: Storage): Promise<number> {
  const all = await findAllWithBalance(storage);
  return selectLiquidAccounts(all).reduce((sum, a) => sum + a.balance, 0);
}

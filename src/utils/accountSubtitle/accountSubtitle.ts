import type { AccountKind, AccountWithBalance } from "../../types/account";

const KIND_SUBTITLE: Record<Exclude<AccountKind, "CreditCard">, string> = {
  Girokonto: "Checking account",
  Tagesgeld: "Savings account",
  Investment: "Investment account",
  Mortgage: "Mortgage · Restschuld",
};

/**
 * A short, real-data subtitle for the Account Detail hero. Derived purely from
 * the account's kind and linkage — the domain has no free-text description
 * field, so this stands in for the prototype's hand-authored sub-line. A linked
 * credit card names its funding account; everything else gets a per-kind label.
 */
export function accountSubtitle(
  account: AccountWithBalance,
  accounts: AccountWithBalance[]
): string {
  if (account.kind === "CreditCard") {
    const funding = account.linkedAccountId
      ? accounts.find((a) => a.id === account.linkedAccountId)
      : undefined;
    return funding
      ? `Credit card · settles monthly → ${funding.name}`
      : "Credit card";
  }
  return KIND_SUBTITLE[account.kind];
}

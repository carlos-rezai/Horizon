export interface Transaction {
  id: string;
  accountId: string;
  date: string;
  amount: number;
  description: string;
  category: string;
  transferId?: string;
  recurringTransactionId?: string;
  isAutoSettlement?: boolean;
}

/**
 * A transaction as the user has typed it, before any account has been debited:
 * what a create form hands back to the surface that owns the network.
 */
export interface TransactionDraft {
  date: string;
  /** In cents, signed — negative for money leaving the account. */
  amount: number;
  description: string;
  category: string;
  /** Set when the expense is really a transfer to another account. */
  toAccountId?: string;
}

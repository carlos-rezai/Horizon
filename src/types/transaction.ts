export interface Transaction {
  _id: string;
  accountId: string;
  date: string;
  amount: number;
  description: string;
  category: string;
  transferId?: string;
  recurringTransactionId?: string;
}

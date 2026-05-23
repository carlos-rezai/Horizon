import type {
  Account,
  AccountCreateInput,
  AccountUpdateInput,
  AccountWithBalance,
  Category,
  CategoryCreateInput,
  DeleteResult,
  RecurringTransaction,
  RecurringTransactionCreateInput,
  RecurringTransactionUpdateInput,
  Transaction,
  TransactionCreateInput,
  TransactionUpdateInput,
  TransferCreateInput,
} from "./types.js";

export interface AccountsRepo {
  create(input: AccountCreateInput): Promise<Account>;
  findAll(): Promise<Account[]>;
  findById(id: string): Promise<Account | null>;
  update(id: string, input: AccountUpdateInput): Promise<Account | null>;
  delete(id: string): Promise<DeleteResult | null>;
  findAllWithBalance(): Promise<AccountWithBalance[]>;
  findByIdWithBalance(id: string): Promise<AccountWithBalance | null>;
  getTotalLiquid(): Promise<number>;
}

export interface TransactionsRepo {
  findAll(): Promise<Transaction[]>;
  findById(id: string): Promise<Transaction | null>;
  findByAccount(
    accountId: string,
    opts?: { month?: string }
  ): Promise<Transaction[]>;
  findByTransferId(transferId: string): Promise<Transaction[]>;
  create(
    accountId: string,
    input: TransactionCreateInput
  ): Promise<Transaction | null>;
  update(
    id: string,
    input: TransactionUpdateInput
  ): Promise<Transaction | null>;
  delete(id: string): Promise<DeleteResult | null>;
}

export interface TransfersRepo {
  create(input: TransferCreateInput): Promise<{ transferId: string } | null>;
  delete(transferId: string): Promise<boolean>;
}

export interface CategoriesRepo {
  findAll(): Promise<Category[]>;
  create(input: CategoryCreateInput): Promise<Category>;
  delete(id: string): Promise<DeleteResult | null>;
}

export interface RecurringTransactionsRepo {
  findAll(): Promise<RecurringTransaction[]>;
  findActive(): Promise<RecurringTransaction[]>;
  create(
    input: RecurringTransactionCreateInput
  ): Promise<RecurringTransaction | null>;
  update(
    id: string,
    input: RecurringTransactionUpdateInput
  ): Promise<RecurringTransaction | null>;
  delete(id: string): Promise<boolean>;
}

export interface StorageStatus {
  driver: "mongo" | "sqlite";
  schemaVersion: number;
  integrity: string;
  path?: string;
  sizeBytes?: number;
}

export interface Storage {
  accounts: AccountsRepo;
  transactions: TransactionsRepo;
  transfers: TransfersRepo;
  categories: CategoriesRepo;
  recurringTransactions: RecurringTransactionsRepo;
  close(): Promise<void>;
  serialize(): Buffer;
  backup(destPath: string): Promise<void>;
  restore(srcPath: string): Promise<void>;
  status(): Promise<StorageStatus>;
}

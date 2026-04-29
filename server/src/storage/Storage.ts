import type {
  Account,
  AccountCreateInput,
  AccountUpdateInput,
  AccountWithBalance,
  DeleteResult,
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

export interface Storage {
  accounts: AccountsRepo;
  close(): Promise<void>;
}

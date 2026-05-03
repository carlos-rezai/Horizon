import { afterEach, beforeAll, afterAll, describe, expect, it } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import { createStorage } from "../storage/index.js";
import type { Storage } from "../storage/Storage.js";
import type { Account, RecurringTransaction } from "../storage/types.js";
import { DEFAULT_CATEGORY_NAMES } from "../storage/defaultCategories.js";

export type MakeStorage = () => Promise<{
  storage: Storage;
  reset: () => Promise<void>;
  cleanup: () => Promise<void>;
}>;

export function runStorageSpec(
  driver: "sqlite" | "mongo",
  makeStorage: MakeStorage
): void {
  let storage: Storage;
  let reset: () => Promise<void>;
  let cleanup: () => Promise<void>;

  beforeAll(async () => {
    const handle = await makeStorage();
    storage = handle.storage;
    reset = handle.reset;
    cleanup = handle.cleanup;
  });

  afterAll(async () => {
    await cleanup();
  });

  afterEach(async () => {
    await reset();
  });

  async function makeAccount(
    overrides: Partial<{
      kind: Account["kind"];
      name: string;
      openingBalance: number;
      openingDate: string;
    }> = {}
  ): Promise<Account> {
    return storage.accounts.create({
      kind: "Girokonto",
      name: "Main",
      openingBalance: 100000,
      openingDate: "2026-01-01",
      ...overrides,
    });
  }

  // -------------------------------------------------------------------------
  // Accounts — DTO shape
  // -------------------------------------------------------------------------

  describe("AccountsRepo DTO shape", () => {
    it("create returns an Account DTO with a string id and primitive fields", async () => {
      const account = await storage.accounts.create({
        kind: "Girokonto",
        name: "Main",
        openingBalance: 537685,
        openingDate: "2026-03-01",
      });

      expect(typeof account.id).toBe("string");
      expect(account.id.length).toBeGreaterThan(0);
      expect(account.kind).toBe("Girokonto");
      expect(account.name).toBe("Main");
      expect(account.openingBalance).toBe(537685);
      expect(account.openingDate).toBe("2026-03-01");
    });

    it("findAll returns DTOs with string ids", async () => {
      await storage.accounts.create({
        kind: "Girokonto",
        name: "Main",
        openingBalance: 100000,
        openingDate: "2026-03-01",
      });

      const all = await storage.accounts.findAll();

      expect(all).toHaveLength(1);
      expect(typeof all[0].id).toBe("string");
    });

    it("findAll returns an empty array when no accounts exist", async () => {
      const all = await storage.accounts.findAll();
      expect(all).toEqual([]);
    });

    it("preserves sondertilgungAllowance when provided", async () => {
      const created = await storage.accounts.create({
        kind: "Mortgage",
        name: "Darlehen",
        openingBalance: 4000000,
        openingDate: "2026-03-01",
        sondertilgungAllowance: 500000,
      });

      expect(created.sondertilgungAllowance).toBe(500000);
    });
  });

  // -------------------------------------------------------------------------
  // Accounts — findById
  // -------------------------------------------------------------------------

  describe("AccountsRepo.findById", () => {
    it("returns the account by string id", async () => {
      const created = await storage.accounts.create({
        kind: "Tagesgeld",
        name: "DKB",
        openingBalance: 100300,
        openingDate: "2026-03-01",
      });

      const found = await storage.accounts.findById(created.id);

      expect(found).not.toBeNull();
      expect(found?.id).toBe(created.id);
      expect(found?.name).toBe("DKB");
    });

    it("returns null for an unparseable id (no throw, no query)", async () => {
      const found = await storage.accounts.findById("not-a-real-id");
      expect(found).toBeNull();
    });

    it("returns null for an operator-object payload coerced to string", async () => {
      const found = await storage.accounts.findById(
        String({ $ne: null } as unknown as string)
      );
      expect(found).toBeNull();
    });

    it("returns null for an empty string id", async () => {
      const found = await storage.accounts.findById("");
      expect(found).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // Accounts — update
  // -------------------------------------------------------------------------

  describe("AccountsRepo.update", () => {
    it("updates the name and returns the updated DTO", async () => {
      const created = await storage.accounts.create({
        kind: "Girokonto",
        name: "Old",
        openingBalance: 100000,
        openingDate: "2026-03-01",
      });

      const updated = await storage.accounts.update(created.id, {
        name: "New",
      });

      expect(updated?.name).toBe("New");
      expect(updated?.id).toBe(created.id);
    });

    it("updates openingBalance and sondertilgungAllowance", async () => {
      const created = await storage.accounts.create({
        kind: "Mortgage",
        name: "Darlehen",
        openingBalance: 4000000,
        openingDate: "2026-03-01",
      });

      const updated = await storage.accounts.update(created.id, {
        openingBalance: 3900000,
        sondertilgungAllowance: 500000,
      });

      expect(updated?.openingBalance).toBe(3900000);
      expect(updated?.sondertilgungAllowance).toBe(500000);
    });

    it("returns null for an unparseable id", async () => {
      const updated = await storage.accounts.update("not-an-id", {
        name: "X",
      });
      expect(updated).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // Accounts — delete
  // -------------------------------------------------------------------------

  describe("AccountsRepo.delete", () => {
    it("returns { ok: true } and removes the account when it has no transactions", async () => {
      const created = await storage.accounts.create({
        kind: "Investment",
        name: "MSCI",
        openingBalance: 0,
        openingDate: "2026-03-01",
      });

      const result = await storage.accounts.delete(created.id);

      expect(result).toEqual({ ok: true });
      expect(await storage.accounts.findById(created.id)).toBeNull();
    });

    it('returns { ok: false, reason: "has_transactions" } when transactions exist', async () => {
      const account = await makeAccount();
      await storage.transactions.create(account.id, {
        date: "2026-03-15",
        amount: -1000,
        description: "Coffee",
        category: "Food",
      });

      const result = await storage.accounts.delete(account.id);

      expect(result).toEqual({ ok: false, reason: "has_transactions" });
      expect(await storage.accounts.findById(account.id)).not.toBeNull();
    });

    it("returns null for an unparseable id", async () => {
      const result = await storage.accounts.delete("not-an-id");
      expect(result).toBeNull();
    });

    it('returns { ok: false, reason: "in_use" } when an active recurring transaction references the account', async () => {
      const account = await makeAccount();
      await storage.recurringTransactions.create({
        accountId: account.id,
        amount: 95000,
        description: "Rent",
        category: "Housing",
        frequency: "monthly",
        dayOfMonth: 1,
      });

      const result = await storage.accounts.delete(account.id);

      expect(result).toEqual({ ok: false, reason: "in_use" });
      expect(await storage.accounts.findById(account.id)).not.toBeNull();
    });

    it('returns { ok: false, reason: "in_use" } when an inactive recurring transaction references the account', async () => {
      const account = await makeAccount();
      const rt = await storage.recurringTransactions.create({
        accountId: account.id,
        amount: 95000,
        description: "Rent",
        category: "Housing",
        frequency: "monthly",
        dayOfMonth: 1,
      });
      // RecurringTransactionsRepo.create can return null after step 14 lands;
      // at this commit it always succeeds, so the cast is safe here.
      await storage.recurringTransactions.update(rt!.id, { isActive: false });

      const result = await storage.accounts.delete(account.id);

      expect(result).toEqual({ ok: false, reason: "in_use" });
    });

    it('returns { ok: false, reason: "in_use" } when a recurring transaction\'s linkedAccountId references the account', async () => {
      const source = await makeAccount({ name: "Source" });
      const linked = await makeAccount({ name: "Linked" });
      await storage.recurringTransactions.create({
        accountId: source.id,
        amount: 50000,
        description: "Sondertilgung",
        category: "Transfer",
        frequency: "annual",
        dayOfMonth: 1,
        linkedAccountId: linked.id,
      });

      const result = await storage.accounts.delete(linked.id);

      expect(result).toEqual({ ok: false, reason: "in_use" });
    });

    it('returns { ok: false, reason: "in_use" } when a milestone references the account', async () => {
      const account = await makeAccount();
      await storage.milestones.create({
        name: "Emergency fund",
        accountId: account.id,
        targetBalance: 600000,
      });

      const result = await storage.accounts.delete(account.id);

      expect(result).toEqual({ ok: false, reason: "in_use" });
    });
  });

  // -------------------------------------------------------------------------
  // Accounts — findByIdWithBalance
  // -------------------------------------------------------------------------

  describe("AccountsRepo.findByIdWithBalance", () => {
    it("returns AccountWithBalance: balance = opening + sum(tx)", async () => {
      const created = await storage.accounts.create({
        kind: "Girokonto",
        name: "Main",
        openingBalance: 500000,
        openingDate: "2026-03-01",
      });

      await storage.transactions.create(created.id, {
        date: "2026-03-15",
        amount: 100000,
        description: "Salary",
        category: "Income",
      });
      await storage.transactions.create(created.id, {
        date: "2026-03-20",
        amount: -50000,
        description: "Rent",
        category: "Housing",
      });

      const result = await storage.accounts.findByIdWithBalance(created.id);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(created.id);
      expect(result?.balance).toBe(550000);
    });

    it("returns null for an unparseable id", async () => {
      const result = await storage.accounts.findByIdWithBalance("not-an-id");
      expect(result).toBeNull();
    });

    it("returns balance = openingBalance for an account with no transactions", async () => {
      const created = await storage.accounts.create({
        kind: "Tagesgeld",
        name: "Reserve",
        openingBalance: 12345,
        openingDate: "2026-03-01",
      });

      const result = await storage.accounts.findByIdWithBalance(created.id);

      expect(result?.balance).toBe(12345);
    });
  });

  // -------------------------------------------------------------------------
  // Accounts — findAllWithBalance
  // -------------------------------------------------------------------------

  describe("AccountsRepo.findAllWithBalance", () => {
    it("returns one entry per account with balance = opening + sum(tx)", async () => {
      const a = await storage.accounts.create({
        kind: "Girokonto",
        name: "Main",
        openingBalance: 500000,
        openingDate: "2026-03-01",
      });
      const b = await storage.accounts.create({
        kind: "Tagesgeld",
        name: "Reserve",
        openingBalance: 200000,
        openingDate: "2026-03-01",
      });

      await storage.transactions.create(a.id, {
        date: "2026-03-15",
        amount: 100000,
        description: "Salary",
        category: "Income",
      });
      await storage.transactions.create(b.id, {
        date: "2026-03-15",
        amount: -50000,
        description: "Withdrawal",
        category: "Transfer",
      });

      const all = await storage.accounts.findAllWithBalance();
      const byId = new Map(all.map((acc) => [acc.id, acc]));

      expect(byId.get(a.id)?.balance).toBe(600000);
      expect(byId.get(b.id)?.balance).toBe(150000);
    });

    it("returns balance = openingBalance for an account with no transactions", async () => {
      const created = await storage.accounts.create({
        kind: "Girokonto",
        name: "Empty",
        openingBalance: 12345,
        openingDate: "2026-03-01",
      });

      const all = await storage.accounts.findAllWithBalance();

      expect(all).toHaveLength(1);
      expect(all[0].id).toBe(created.id);
      expect(all[0].balance).toBe(12345);
    });

    it("returns an empty array when no accounts exist", async () => {
      const all = await storage.accounts.findAllWithBalance();
      expect(all).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // Accounts — getTotalLiquid
  // -------------------------------------------------------------------------

  describe("AccountsRepo.getTotalLiquid", () => {
    it("sums Girokonto + Tagesgeld balances and excludes other kinds", async () => {
      const giro = await storage.accounts.create({
        kind: "Girokonto",
        name: "Main",
        openingBalance: 500000,
        openingDate: "2026-03-01",
      });
      const tg = await storage.accounts.create({
        kind: "Tagesgeld",
        name: "Reserve",
        openingBalance: 200000,
        openingDate: "2026-03-01",
      });
      await storage.accounts.create({
        kind: "Mortgage",
        name: "Darlehen",
        openingBalance: 4000000,
        openingDate: "2026-03-01",
      });
      await storage.accounts.create({
        kind: "Investment",
        name: "MSCI",
        openingBalance: 100000,
        openingDate: "2026-03-01",
      });
      await storage.accounts.create({
        kind: "CreditCard",
        name: "Visa",
        openingBalance: 0,
        openingDate: "2026-03-01",
      });

      await storage.transactions.create(giro.id, {
        date: "2026-03-15",
        amount: 100000,
        description: "Salary",
        category: "Income",
      });
      await storage.transactions.create(tg.id, {
        date: "2026-03-15",
        amount: 50000,
        description: "Interest",
        category: "Income",
      });

      const total = await storage.accounts.getTotalLiquid();

      expect(total).toBe(500000 + 100000 + 200000 + 50000);
    });

    it("returns 0 when no Girokonto or Tagesgeld accounts exist", async () => {
      await storage.accounts.create({
        kind: "Mortgage",
        name: "Darlehen",
        openingBalance: 4000000,
        openingDate: "2026-03-01",
      });

      const total = await storage.accounts.getTotalLiquid();
      expect(total).toBe(0);
    });

    it("returns 0 when no accounts exist", async () => {
      const total = await storage.accounts.getTotalLiquid();
      expect(total).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // Transactions — DTO shape & create
  // -------------------------------------------------------------------------

  describe("TransactionsRepo DTO shape", () => {
    it("create returns a Transaction DTO with string id and accountId", async () => {
      const account = await makeAccount();

      const tx = await storage.transactions.create(account.id, {
        date: "2026-03-15",
        amount: -8500,
        description: "Supermarket",
        category: "Food",
      });

      expect(tx).not.toBeNull();
      expect(typeof tx?.id).toBe("string");
      expect(typeof tx?.accountId).toBe("string");
      expect(tx?.accountId).toBe(account.id);
      expect(tx?.date).toBe("2026-03-15");
      expect(tx?.amount).toBe(-8500);
      expect(tx?.description).toBe("Supermarket");
      expect(tx?.category).toBe("Food");
    });

    it("findAll returns DTOs with string ids", async () => {
      const account = await makeAccount();
      await storage.transactions.create(account.id, {
        date: "2026-03-15",
        amount: -1000,
        description: "Coffee",
        category: "Food",
      });

      const all = await storage.transactions.findAll();

      expect(all).toHaveLength(1);
      expect(typeof all[0].id).toBe("string");
    });
  });

  describe("TransactionsRepo.create", () => {
    it("returns null for an unparseable accountId", async () => {
      const result = await storage.transactions.create("not-an-id", {
        date: "2026-03-15",
        amount: -1000,
        description: "Coffee",
        category: "Food",
      });
      expect(result).toBeNull();
      expect(await storage.transactions.findAll()).toEqual([]);
    });

    it("does not set transferId on a plain transaction", async () => {
      const account = await makeAccount();
      const tx = await storage.transactions.create(account.id, {
        date: "2026-03-15",
        amount: -1000,
        description: "Coffee",
        category: "Food",
      });
      expect(tx?.transferId).toBeUndefined();
    });

    it("does not insert an orphan when accountId is well-formed but unknown", async () => {
      // A well-formed UUID that no Account row matches. Both drivers must
      // refuse the insert: Mongo via its app-level existence check, SQLite
      // via app-level existence check + FK constraint as defence in depth.
      const unknownId = "00000000-0000-4000-8000-999999999999";

      let result: Awaited<
        ReturnType<typeof storage.transactions.create>
      > | null = null;
      try {
        result = await storage.transactions.create(unknownId, {
          date: "2026-03-15",
          amount: -1000,
          description: "Orphan",
          category: "Food",
        });
      } catch {
        result = null;
      }

      expect(result).toBeNull();
      expect(await storage.transactions.findAll()).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // Transactions — findAll, findByAccount, findByTransferId
  // -------------------------------------------------------------------------

  describe("TransactionsRepo.findAll", () => {
    it("returns transactions across all accounts", async () => {
      const a = await makeAccount({ name: "A" });
      const b = await makeAccount({ name: "B" });

      await storage.transactions.create(a.id, {
        date: "2026-03-01",
        amount: -100,
        description: "x",
        category: "Food",
      });
      await storage.transactions.create(b.id, {
        date: "2026-03-02",
        amount: -200,
        description: "y",
        category: "Food",
      });

      const all = await storage.transactions.findAll();
      expect(all).toHaveLength(2);
    });

    it("returns an empty array when no transactions exist", async () => {
      const all = await storage.transactions.findAll();
      expect(all).toEqual([]);
    });
  });

  describe("TransactionsRepo.findByAccount", () => {
    it("returns only transactions for the given account", async () => {
      const a = await makeAccount({ name: "A" });
      const b = await makeAccount({ name: "B" });

      await storage.transactions.create(a.id, {
        date: "2026-03-01",
        amount: -100,
        description: "for-a",
        category: "Food",
      });
      await storage.transactions.create(b.id, {
        date: "2026-03-01",
        amount: -200,
        description: "for-b",
        category: "Food",
      });

      const aTxs = await storage.transactions.findByAccount(a.id);
      expect(aTxs).toHaveLength(1);
      expect(aTxs[0].description).toBe("for-a");
    });

    it("returns an empty array for an unparseable accountId", async () => {
      const list = await storage.transactions.findByAccount("not-an-id");
      expect(list).toEqual([]);
    });

    it("returns an empty array for an account with no transactions", async () => {
      const account = await makeAccount();
      const list = await storage.transactions.findByAccount(account.id);
      expect(list).toEqual([]);
    });

    it("filters by month when opts.month is provided", async () => {
      const account = await makeAccount();

      await storage.transactions.create(account.id, {
        date: "2026-02-28",
        amount: -100,
        description: "feb",
        category: "Food",
      });
      await storage.transactions.create(account.id, {
        date: "2026-03-01",
        amount: -200,
        description: "march-start",
        category: "Food",
      });
      await storage.transactions.create(account.id, {
        date: "2026-03-31",
        amount: -300,
        description: "march-end",
        category: "Food",
      });
      await storage.transactions.create(account.id, {
        date: "2026-04-01",
        amount: -400,
        description: "april",
        category: "Food",
      });

      const march = await storage.transactions.findByAccount(account.id, {
        month: "2026-03",
      });

      const descriptions = march.map((t) => t.description).sort();
      expect(descriptions).toEqual(["march-end", "march-start"]);
    });

    it("filters by month across a December → January boundary", async () => {
      const account = await makeAccount();

      await storage.transactions.create(account.id, {
        date: "2026-12-31",
        amount: -100,
        description: "dec",
        category: "Food",
      });
      await storage.transactions.create(account.id, {
        date: "2027-01-01",
        amount: -200,
        description: "jan",
        category: "Food",
      });

      const dec = await storage.transactions.findByAccount(account.id, {
        month: "2026-12",
      });

      expect(dec.map((t) => t.description)).toEqual(["dec"]);
    });
  });

  describe("TransactionsRepo.findByTransferId", () => {
    it("returns both legs sharing a transferId", async () => {
      const source = await makeAccount({ name: "Source", kind: "Girokonto" });
      const dest = await makeAccount({ name: "Dest", kind: "Tagesgeld" });

      const created = await storage.transfers.create({
        fromAccountId: source.id,
        toAccountId: dest.id,
        amount: 70000,
        date: "2026-03-01",
        description: "Transfer",
        category: "Transfer",
      });

      expect(created).not.toBeNull();
      const legs = await storage.transactions.findByTransferId(
        created!.transferId
      );

      expect(legs).toHaveLength(2);
      expect(legs.every((l) => l.transferId === created!.transferId)).toBe(
        true
      );
    });

    it("returns an empty array when no transactions match the transferId", async () => {
      const legs = await storage.transactions.findByTransferId("nonexistent");
      expect(legs).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // Transactions — update, delete
  // -------------------------------------------------------------------------

  describe("TransactionsRepo.update", () => {
    it("updates amount, description, category, and date", async () => {
      const account = await makeAccount();
      const tx = await storage.transactions.create(account.id, {
        date: "2026-03-15",
        amount: -8500,
        description: "Old",
        category: "Food",
      });

      const updated = await storage.transactions.update(tx!.id, {
        amount: -9000,
        description: "Updated",
        category: "Entertainment",
        date: "2026-03-16",
      });

      expect(updated?.amount).toBe(-9000);
      expect(updated?.description).toBe("Updated");
      expect(updated?.category).toBe("Entertainment");
      expect(updated?.date).toBe("2026-03-16");
      expect(updated?.id).toBe(tx!.id);
    });

    it("returns null for an unparseable id", async () => {
      const result = await storage.transactions.update("not-an-id", {
        description: "x",
      });
      expect(result).toBeNull();
    });
  });

  describe("TransactionsRepo.delete", () => {
    it("returns { ok: true } and removes the transaction", async () => {
      const account = await makeAccount();
      const tx = await storage.transactions.create(account.id, {
        date: "2026-03-15",
        amount: -1000,
        description: "Coffee",
        category: "Food",
      });

      const result = await storage.transactions.delete(tx!.id);

      expect(result).toEqual({ ok: true });
      expect(await storage.transactions.findAll()).toHaveLength(0);
    });

    it('returns { ok: false, reason: "is_transfer_leg" } when the transaction has a transferId', async () => {
      const source = await makeAccount({ name: "Source", kind: "Girokonto" });
      const dest = await makeAccount({ name: "Dest", kind: "Tagesgeld" });

      const transfer = await storage.transfers.create({
        fromAccountId: source.id,
        toAccountId: dest.id,
        amount: 70000,
        date: "2026-03-01",
        description: "Transfer",
        category: "Transfer",
      });

      const legs = await storage.transactions.findByTransferId(
        transfer!.transferId
      );

      const result = await storage.transactions.delete(legs[0].id);

      expect(result).toEqual({ ok: false, reason: "is_transfer_leg" });

      const stillThere = await storage.transactions.findByTransferId(
        transfer!.transferId
      );
      expect(stillThere).toHaveLength(2);
    });

    it("returns null for an unparseable id", async () => {
      const result = await storage.transactions.delete("not-an-id");
      expect(result).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // Transfers
  // -------------------------------------------------------------------------

  describe("TransfersRepo.create", () => {
    it("writes two linked legs sharing a string transferId", async () => {
      const source = await makeAccount({ name: "Source", kind: "Girokonto" });
      const dest = await makeAccount({ name: "Dest", kind: "Tagesgeld" });

      const result = await storage.transfers.create({
        fromAccountId: source.id,
        toAccountId: dest.id,
        amount: 70000,
        date: "2026-03-01",
        description: "Sondertilgung reserve",
        category: "Transfer",
      });

      expect(result).not.toBeNull();
      expect(typeof result?.transferId).toBe("string");
      expect(result!.transferId.length).toBeGreaterThan(0);

      const legs = await storage.transactions.findByTransferId(
        result!.transferId
      );
      expect(legs).toHaveLength(2);
    });

    it("creates a debit on the source and a credit on the destination", async () => {
      const source = await makeAccount({ name: "Source", kind: "Girokonto" });
      const dest = await makeAccount({ name: "Dest", kind: "Tagesgeld" });

      const result = await storage.transfers.create({
        fromAccountId: source.id,
        toAccountId: dest.id,
        amount: 70000,
        date: "2026-03-01",
        description: "Transfer",
        category: "Transfer",
      });

      const sourceTxs = await storage.transactions.findByAccount(source.id);
      const destTxs = await storage.transactions.findByAccount(dest.id);

      expect(sourceTxs).toHaveLength(1);
      expect(destTxs).toHaveLength(1);
      expect(sourceTxs[0].amount).toBe(-70000);
      expect(destTxs[0].amount).toBe(70000);
      expect(sourceTxs[0].transferId).toBe(result!.transferId);
      expect(destTxs[0].transferId).toBe(result!.transferId);
    });

    it("returns null when fromAccountId is unparseable (no rows persist)", async () => {
      const dest = await makeAccount({ name: "Dest", kind: "Tagesgeld" });

      const result = await storage.transfers.create({
        fromAccountId: "not-an-id",
        toAccountId: dest.id,
        amount: 70000,
        date: "2026-03-01",
        description: "Transfer",
        category: "Transfer",
      });

      expect(result).toBeNull();
      expect(await storage.transactions.findAll()).toEqual([]);
    });

    it("returns null when toAccountId is unparseable (no rows persist)", async () => {
      const source = await makeAccount({ name: "Source", kind: "Girokonto" });

      const result = await storage.transfers.create({
        fromAccountId: source.id,
        toAccountId: "not-an-id",
        amount: 70000,
        date: "2026-03-01",
        description: "Transfer",
        category: "Transfer",
      });

      expect(result).toBeNull();
      expect(await storage.transactions.findAll()).toEqual([]);
    });

    it("returns null when fromAccountId is well-formed but unknown", async () => {
      const dest = await makeAccount({ name: "Dest", kind: "Tagesgeld" });

      const result = await storage.transfers.create({
        fromAccountId: "00000000-0000-0000-0000-000000000000",
        toAccountId: dest.id,
        amount: 70000,
        date: "2026-03-01",
        description: "Transfer",
        category: "Transfer",
      });

      expect(result).toBeNull();
      expect(await storage.transactions.findAll()).toEqual([]);
    });
  });

  describe("TransfersRepo.delete", () => {
    it("removes both legs and returns true", async () => {
      const source = await makeAccount({ name: "Source", kind: "Girokonto" });
      const dest = await makeAccount({ name: "Dest", kind: "Tagesgeld" });

      const created = await storage.transfers.create({
        fromAccountId: source.id,
        toAccountId: dest.id,
        amount: 70000,
        date: "2026-03-01",
        description: "Transfer",
        category: "Transfer",
      });

      const result = await storage.transfers.delete(created!.transferId);

      expect(result).toBe(true);
      expect(
        await storage.transactions.findByTransferId(created!.transferId)
      ).toEqual([]);
    });

    it("returns false for an unknown transferId", async () => {
      const result = await storage.transfers.delete("nonexistent-transfer-id");
      expect(result).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // Categories
  // -------------------------------------------------------------------------

  describe("CategoriesRepo.findAll", () => {
    it("includes the seeded default categories", async () => {
      const all = await storage.categories.findAll();
      const names = all.map((c) => c.name);

      for (const name of DEFAULT_CATEGORY_NAMES) {
        expect(names).toContain(name);
      }
    });

    it("includes custom categories alongside defaults", async () => {
      await storage.categories.create({ name: "Vet" });

      const all = await storage.categories.findAll();
      const names = all.map((c) => c.name);

      expect(names).toContain("Vet");
      expect(names).toContain("Food");
    });

    it("returns DTOs with string ids and isDefault booleans", async () => {
      const all = await storage.categories.findAll();
      expect(all.length).toBeGreaterThan(0);
      for (const cat of all) {
        expect(typeof cat.id).toBe("string");
        expect(typeof cat.name).toBe("string");
        expect(typeof cat.isDefault).toBe("boolean");
      }
    });
  });

  describe("CategoriesRepo.create", () => {
    it("creates a custom category with isDefault: false", async () => {
      const cat = await storage.categories.create({ name: "Vet" });

      expect(cat.name).toBe("Vet");
      expect(cat.isDefault).toBe(false);
      expect(typeof cat.id).toBe("string");
    });
  });

  describe("CategoriesRepo.delete", () => {
    it("returns { ok: true } and removes a custom category with no transactions", async () => {
      const created = await storage.categories.create({ name: "Vet" });

      const result = await storage.categories.delete(created.id);

      expect(result).toEqual({ ok: true });
      const all = await storage.categories.findAll();
      expect(all.find((c) => c.name === "Vet")).toBeUndefined();
    });

    it('returns { ok: false, reason: "is_default" } for a default category', async () => {
      const all = await storage.categories.findAll();
      const food = all.find((c) => c.name === "Food");
      expect(food).toBeDefined();

      const result = await storage.categories.delete(food!.id);

      expect(result).toEqual({ ok: false, reason: "is_default" });
      const stillThere = await storage.categories.findAll();
      expect(stillThere.find((c) => c.name === "Food")).toBeDefined();
    });

    it('returns { ok: false, reason: "in_use" } when a transaction references the category', async () => {
      const created = await storage.categories.create({ name: "Vet" });

      const account = await makeAccount();

      await storage.transactions.create(account.id, {
        date: "2026-03-01",
        amount: -6425,
        description: "Lassie",
        category: "Vet",
      });

      const result = await storage.categories.delete(created.id);

      expect(result).toEqual({ ok: false, reason: "in_use" });
      const all = await storage.categories.findAll();
      expect(all.find((c) => c.name === "Vet")).toBeDefined();
    });

    it("returns null for an unparseable id", async () => {
      const result = await storage.categories.delete("not-an-id");
      expect(result).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // Milestones
  // -------------------------------------------------------------------------

  describe("MilestonesRepo.findAll", () => {
    it("returns an empty array when no milestones exist", async () => {
      const all = await storage.milestones.findAll();
      expect(all).toEqual([]);
    });

    it("returns all milestones with string ids and accountIds", async () => {
      const account = await makeAccount({
        kind: "Tagesgeld",
        name: "Reserve",
        openingBalance: 500000,
      });

      await storage.milestones.create({
        name: "Emergency fund",
        accountId: account.id,
        targetBalance: 600000,
      });
      await storage.milestones.create({
        name: "House deposit",
        accountId: account.id,
        targetBalance: 2000000,
      });

      const all = await storage.milestones.findAll();
      expect(all).toHaveLength(2);
      for (const m of all) {
        expect(typeof m.id).toBe("string");
        expect(typeof m.accountId).toBe("string");
      }
    });
  });

  describe("MilestonesRepo.create", () => {
    it("returns the milestone DTO for a valid accountId", async () => {
      const account = await makeAccount();

      const milestone = await storage.milestones.create({
        name: "Emergency fund",
        accountId: account.id,
        targetBalance: 600000,
      });

      expect(milestone).not.toBeNull();
      expect(milestone?.accountId).toBe(account.id);
      expect(milestone?.name).toBe("Emergency fund");
      expect(milestone?.targetBalance).toBe(600000);
    });

    it("returns null for an unparseable accountId (no row persists)", async () => {
      const milestone = await storage.milestones.create({
        name: "Emergency fund",
        accountId: "not-an-id",
        targetBalance: 600000,
      });

      expect(milestone).toBeNull();
      expect(await storage.milestones.findAll()).toEqual([]);
    });

    it("returns null for a well-formed but unknown accountId", async () => {
      const milestone = await storage.milestones.create({
        name: "Emergency fund",
        accountId: "00000000-0000-0000-0000-000000000000",
        targetBalance: 600000,
      });

      expect(milestone).toBeNull();
      expect(await storage.milestones.findAll()).toEqual([]);
    });
  });

  describe("MilestonesRepo.delete", () => {
    it("returns true and removes the milestone", async () => {
      const account = await makeAccount();
      const milestone = await storage.milestones.create({
        name: "Emergency fund",
        accountId: account.id,
        targetBalance: 600000,
      });

      const result = await storage.milestones.delete(milestone!.id);

      expect(result).toBe(true);
      expect(await storage.milestones.findAll()).toEqual([]);
    });

    it("returns false for an unparseable id", async () => {
      const result = await storage.milestones.delete("not-an-id");
      expect(result).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // RecurringTransactions
  // -------------------------------------------------------------------------

  describe("RecurringTransactionsRepo.create", () => {
    it("defaults isActive to true and returns a DTO with string id", async () => {
      const account = await makeAccount();

      const r = await storage.recurringTransactions.create({
        accountId: account.id,
        amount: 95000,
        description: "Rent",
        category: "Housing",
        frequency: "monthly",
        dayOfMonth: 1,
      });

      expect(typeof r.id).toBe("string");
      expect(r.accountId).toBe(account.id);
      expect(r.amount).toBe(95000);
      expect(r.description).toBe("Rent");
      expect(r.category).toBe("Housing");
      expect(r.frequency).toBe("monthly");
      expect(r.dayOfMonth).toBe(1);
      expect(r.isActive).toBe(true);
    });

    it("preserves linkedAccountId for a recurring transfer", async () => {
      const source = await makeAccount({ name: "Main", kind: "Girokonto" });
      const dest = await makeAccount({ name: "Savings", kind: "Tagesgeld" });

      const r = await storage.recurringTransactions.create({
        accountId: source.id,
        amount: 50000,
        description: "Monthly savings transfer",
        category: "Transfer",
        frequency: "monthly",
        dayOfMonth: 5,
        linkedAccountId: dest.id,
      });

      expect(r.linkedAccountId).toBe(dest.id);
    });

    it("preserves monthOfYear for an annual recurring transaction", async () => {
      const account = await makeAccount();

      const r = await storage.recurringTransactions.create({
        accountId: account.id,
        amount: 500000,
        description: "Sondertilgung",
        category: "Transfer",
        frequency: "annual",
        dayOfMonth: 1,
        monthOfYear: 10,
      });

      expect(r.monthOfYear).toBe(10);
      expect(r.frequency).toBe("annual");
    });

    it("does not set linkedAccountId or monthOfYear when not provided", async () => {
      const account = await makeAccount();

      const r = await storage.recurringTransactions.create({
        accountId: account.id,
        amount: 95000,
        description: "Rent",
        category: "Housing",
        frequency: "monthly",
        dayOfMonth: 1,
      });

      expect(r.linkedAccountId).toBeUndefined();
      expect(r.monthOfYear).toBeUndefined();
    });

    it("does not insert an orphan when linkedAccountId is well-formed but unknown", async () => {
      // The source accountId is real, but linkedAccountId points at no
      // existing Account row. Today both drivers happily insert the orphan.
      // After SQLite gains FKs (step 10), the SQLite INSERT will fail at the
      // DB level. After step 14, both drivers reject the input cleanly.
      const source = await makeAccount();
      const unknownId = "00000000-0000-4000-8000-999999999999";

      try {
        await storage.recurringTransactions.create({
          accountId: source.id,
          amount: 50000,
          description: "Orphan transfer",
          category: "Transfer",
          frequency: "monthly",
          dayOfMonth: 5,
          linkedAccountId: unknownId,
        });
      } catch {
        // Acceptable: FK constraint may throw — defence in depth.
      }

      const all = await storage.recurringTransactions.findAll();
      const orphans = all.filter((rt) => rt.linkedAccountId === unknownId);
      expect(orphans).toEqual([]);
    });

    it("returns null when accountId is well-formed but unknown", async () => {
      const unknownId = "00000000-0000-4000-8000-999999999999";

      let result: RecurringTransaction | null = null;
      try {
        result = await storage.recurringTransactions.create({
          accountId: unknownId,
          amount: 95000,
          description: "Rent",
          category: "Housing",
          frequency: "monthly",
          dayOfMonth: 1,
        });
      } catch {
        result = null;
      }

      expect(result).toBeNull();
      expect(await storage.recurringTransactions.findAll()).toEqual([]);
    });

    it("returns null when linkedAccountId is well-formed but unknown", async () => {
      const source = await makeAccount();
      const unknownId = "00000000-0000-4000-8000-999999999999";

      let result: RecurringTransaction | null = null;
      try {
        result = await storage.recurringTransactions.create({
          accountId: source.id,
          amount: 50000,
          description: "Orphan transfer",
          category: "Transfer",
          frequency: "monthly",
          dayOfMonth: 5,
          linkedAccountId: unknownId,
        });
      } catch {
        result = null;
      }

      expect(result).toBeNull();
    });

    it("returns null for an unparseable accountId", async () => {
      let result: RecurringTransaction | null = null;
      try {
        result = await storage.recurringTransactions.create({
          accountId: "not-an-id",
          amount: 95000,
          description: "Rent",
          category: "Housing",
          frequency: "monthly",
          dayOfMonth: 1,
        });
      } catch {
        result = null;
      }

      expect(result).toBeNull();
      expect(await storage.recurringTransactions.findAll()).toEqual([]);
    });

    it("returns null for an unparseable linkedAccountId", async () => {
      const source = await makeAccount();

      let result: RecurringTransaction | null = null;
      try {
        result = await storage.recurringTransactions.create({
          accountId: source.id,
          amount: 50000,
          description: "Orphan transfer",
          category: "Transfer",
          frequency: "monthly",
          dayOfMonth: 5,
          linkedAccountId: "not-an-id",
        });
      } catch {
        result = null;
      }

      expect(result).toBeNull();
    });
  });

  describe("RecurringTransactionsRepo.findAll", () => {
    it("returns both active and inactive rows", async () => {
      const account = await makeAccount();

      const a = await storage.recurringTransactions.create({
        accountId: account.id,
        amount: 95000,
        description: "Rent",
        category: "Housing",
        frequency: "monthly",
        dayOfMonth: 1,
      });
      const b = await storage.recurringTransactions.create({
        accountId: account.id,
        amount: 20000,
        description: "Gym",
        category: "Subscriptions",
        frequency: "monthly",
        dayOfMonth: 10,
      });

      await storage.recurringTransactions.update(b.id, { isActive: false });

      const all = await storage.recurringTransactions.findAll();
      expect(all).toHaveLength(2);
      const ids = all.map((r) => r.id);
      expect(ids).toContain(a.id);
      expect(ids).toContain(b.id);
    });

    it("returns an empty array when no recurring transactions exist", async () => {
      const all = await storage.recurringTransactions.findAll();
      expect(all).toEqual([]);
    });
  });

  describe("RecurringTransactionsRepo.findActive", () => {
    it("returns only rows with isActive: true", async () => {
      const account = await makeAccount();

      const active = await storage.recurringTransactions.create({
        accountId: account.id,
        amount: 95000,
        description: "Rent",
        category: "Housing",
        frequency: "monthly",
        dayOfMonth: 1,
      });
      const inactive = await storage.recurringTransactions.create({
        accountId: account.id,
        amount: 20000,
        description: "Gym",
        category: "Subscriptions",
        frequency: "monthly",
        dayOfMonth: 10,
      });

      await storage.recurringTransactions.update(inactive.id, {
        isActive: false,
      });

      const onlyActive = await storage.recurringTransactions.findActive();

      expect(onlyActive).toHaveLength(1);
      expect(onlyActive[0].id).toBe(active.id);
      expect(onlyActive.every((r) => r.isActive === true)).toBe(true);
    });

    it("returns an empty array when no active rows exist", async () => {
      const account = await makeAccount();

      const r = await storage.recurringTransactions.create({
        accountId: account.id,
        amount: 95000,
        description: "Rent",
        category: "Housing",
        frequency: "monthly",
        dayOfMonth: 1,
      });
      await storage.recurringTransactions.update(r.id, { isActive: false });

      const onlyActive = await storage.recurringTransactions.findActive();
      expect(onlyActive).toEqual([]);
    });
  });

  describe("RecurringTransactionsRepo.update", () => {
    it("patches amount, description, and category", async () => {
      const account = await makeAccount();
      const r = await storage.recurringTransactions.create({
        accountId: account.id,
        amount: 95000,
        description: "Rent",
        category: "Housing",
        frequency: "monthly",
        dayOfMonth: 1,
      });

      const updated = await storage.recurringTransactions.update(r.id, {
        amount: 98000,
        description: "New rent",
        category: "Housing",
      });

      expect(updated?.amount).toBe(98000);
      expect(updated?.description).toBe("New rent");
      expect(updated?.id).toBe(r.id);
    });

    it("toggles isActive: true → false → true", async () => {
      const account = await makeAccount();
      const r = await storage.recurringTransactions.create({
        accountId: account.id,
        amount: 95000,
        description: "Rent",
        category: "Housing",
        frequency: "monthly",
        dayOfMonth: 1,
      });

      const off = await storage.recurringTransactions.update(r.id, {
        isActive: false,
      });
      expect(off?.isActive).toBe(false);

      const on = await storage.recurringTransactions.update(r.id, {
        isActive: true,
      });
      expect(on?.isActive).toBe(true);
    });

    it("returns null for an unparseable id", async () => {
      const result = await storage.recurringTransactions.update("not-an-id", {
        amount: 10000,
      });
      expect(result).toBeNull();
    });
  });

  describe("RecurringTransactionsRepo.delete", () => {
    it("returns true and removes the row", async () => {
      const account = await makeAccount();
      const r = await storage.recurringTransactions.create({
        accountId: account.id,
        amount: 95000,
        description: "Rent",
        category: "Housing",
        frequency: "monthly",
        dayOfMonth: 1,
      });

      const result = await storage.recurringTransactions.delete(r.id);

      expect(result).toBe(true);
      expect(await storage.recurringTransactions.findAll()).toEqual([]);
    });

    it("returns false for an unparseable id", async () => {
      const result = await storage.recurringTransactions.delete("not-an-id");
      expect(result).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // Storage.backup
  // -------------------------------------------------------------------------

  describe("Storage.backup", () => {
    if (driver === "mongo") {
      it("rejects with Error('not supported') — Mongo has no online backup", async () => {
        // The Storage facade exposes backup uniformly. The Mongo driver is
        // honest about not implementing it: callers see a typed throw rather
        // than a silent no-op. This is the deliberate asymmetry the parent
        // PRD calls out — mismatched capabilities surface, never hide.
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), "horizon-backup-"));
        const destPath = path.join(dir, "snapshot.db");
        try {
          await expect(storage.backup(destPath)).rejects.toThrow(
            "not supported"
          );
        } finally {
          fs.rmSync(dir, { recursive: true, force: true });
        }
      });
    } else {
      it("writes a self-contained .db file at destPath", async () => {
        const account = await storage.accounts.create({
          kind: "Tagesgeld",
          name: "Backup Source",
          openingBalance: 12345,
          openingDate: "2026-04-01",
        });
        await storage.transactions.create(account.id, {
          date: "2026-04-15",
          amount: -100,
          description: "Coffee",
          category: "Food",
        });

        const dir = fs.mkdtempSync(path.join(os.tmpdir(), "horizon-backup-"));
        const destPath = path.join(dir, "snapshot.db");
        try {
          await storage.backup(destPath);

          expect(fs.existsSync(destPath)).toBe(true);
          // A real SQLite file: non-empty and starting with the SQLite magic
          // string. Guards against a degenerate "touch the path" implementation.
          const contents = fs.readFileSync(destPath);
          expect(contents.length).toBeGreaterThan(0);
          expect(contents.subarray(0, 16).toString("utf8")).toBe(
            "SQLite format 3 "
          );
        } finally {
          fs.rmSync(dir, { recursive: true, force: true });
        }
      });

      it("produces a backup file that round-trips identical data when reopened", async () => {
        const account = await storage.accounts.create({
          kind: "Tagesgeld",
          name: "Backup Source",
          openingBalance: 12345,
          openingDate: "2026-04-01",
        });
        const tx = await storage.transactions.create(account.id, {
          date: "2026-04-15",
          amount: -100,
          description: "Coffee",
          category: "Food",
        });

        const dir = fs.mkdtempSync(path.join(os.tmpdir(), "horizon-backup-"));
        const destPath = path.join(dir, "snapshot.db");
        try {
          await storage.backup(destPath);

          // Open the produced backup file with a fresh storage — exactly the
          // shape the parent PRD specifies (createStorage("sqlite", { path })).
          const restored = await createStorage("sqlite", { path: destPath });
          try {
            const accs = await restored.accounts.findAll();
            expect(accs).toHaveLength(1);
            expect(accs[0].id).toBe(account.id);
            expect(accs[0].name).toBe("Backup Source");
            expect(accs[0].kind).toBe("Tagesgeld");
            expect(accs[0].openingBalance).toBe(12345);

            const txs = await restored.transactions.findAll();
            expect(txs).toHaveLength(1);
            expect(txs[0].id).toBe(tx!.id);
            expect(txs[0].accountId).toBe(account.id);
            expect(txs[0].amount).toBe(-100);
            expect(txs[0].description).toBe("Coffee");
            expect(txs[0].category).toBe("Food");

            // The backup must include seed data too — the restored DB is a
            // full snapshot, not just user rows.
            const cats = await restored.categories.findAll();
            const names = cats.map((c) => c.name);
            for (const name of DEFAULT_CATEGORY_NAMES) {
              expect(names).toContain(name);
            }
          } finally {
            await restored.close();
          }
        } finally {
          fs.rmSync(dir, { recursive: true, force: true });
        }
      });

      it("leaves the live storage usable for further reads and writes after backup", async () => {
        // The PRD: "consistent across WAL, never a torn copy" — backup must
        // not park the live DB in a state that blocks subsequent calls.
        const before = await storage.accounts.create({
          kind: "Girokonto",
          name: "Before",
          openingBalance: 100000,
          openingDate: "2026-04-01",
        });

        const dir = fs.mkdtempSync(path.join(os.tmpdir(), "horizon-backup-"));
        const destPath = path.join(dir, "snapshot.db");
        try {
          await storage.backup(destPath);

          // Read works post-backup.
          const beforeFound = await storage.accounts.findById(before.id);
          expect(beforeFound?.id).toBe(before.id);

          // Write works post-backup.
          const after = await storage.accounts.create({
            kind: "Tagesgeld",
            name: "After",
            openingBalance: 50000,
            openingDate: "2026-04-02",
          });

          const all = await storage.accounts.findAll();
          const ids = all.map((a) => a.id);
          expect(ids).toContain(before.id);
          expect(ids).toContain(after.id);

          // The post-backup write must NOT appear in the prior snapshot —
          // backup captured the state at-the-moment, not future writes.
          const restored = await createStorage("sqlite", { path: destPath });
          try {
            const restoredAccs = await restored.accounts.findAll();
            const restoredIds = restoredAccs.map((a) => a.id);
            expect(restoredIds).toContain(before.id);
            expect(restoredIds).not.toContain(after.id);
          } finally {
            await restored.close();
          }
        } finally {
          fs.rmSync(dir, { recursive: true, force: true });
        }
      });
    }
  });
}

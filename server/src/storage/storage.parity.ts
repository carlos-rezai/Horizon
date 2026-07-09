import { afterEach, beforeAll, afterAll, describe, expect, it } from "vitest";
import Database from "better-sqlite3";
import fs from "fs";
import os from "os";
import path from "path";
import { createStorage } from "../storage/index.js";
import type { Storage } from "../storage/Storage.js";
import type {
  Account,
  Category,
  RecurringTransaction,
} from "../storage/types.js";
import { DEFAULT_CATEGORY_NAMES } from "../storage/defaultCategories.js";
import { StorageIntegrityError } from "../storage/sqlite/errors.js";

export type MakeStorage = () => Promise<{
  storage: Storage;
  reset: () => Promise<void>;
  cleanup: () => Promise<void>;
}>;

export function runStorageSpec(makeStorage: MakeStorage): void {
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

  // Unwraps CategoriesRepo.create for the many tests that only need the happy
  // path. Resilient to both the pre-#159 contract (create returned a Category
  // directly) and the #159 contract (create returns a { ok, category } union),
  // so unrelated create call sites stay green while the union lands.
  async function createCategory(
    name: string,
    color?: string
  ): Promise<Category> {
    const result = await storage.categories.create(
      color === undefined ? { name } : { name, color }
    );
    if (result && typeof result === "object" && "ok" in result) {
      if (!result.ok) {
        throw new Error(`createCategory failed: ${result.reason}`);
      }
      return result.category;
    }
    return result as unknown as Category;
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
  // Accounts — show_in_trajectory
  // -------------------------------------------------------------------------

  describe("AccountsRepo show_in_trajectory", () => {
    it("defaults showInTrajectory to true when not provided", async () => {
      const created = await storage.accounts.create({
        kind: "Girokonto",
        name: "Main",
        openingBalance: 100000,
        openingDate: "2026-03-01",
      });

      expect(created.showInTrajectory).toBe(true);
    });

    it("persists showInTrajectory: false from the create input", async () => {
      const created = await storage.accounts.create({
        kind: "Girokonto",
        name: "Hidden",
        openingBalance: 100000,
        openingDate: "2026-03-01",
        showInTrajectory: false,
      });

      expect(created.showInTrajectory).toBe(false);

      const found = await storage.accounts.findById(created.id);
      expect(found?.showInTrajectory).toBe(false);
    });

    it("toggles showInTrajectory via update and round-trips through findById", async () => {
      const created = await storage.accounts.create({
        kind: "Tagesgeld",
        name: "Reserve",
        openingBalance: 100000,
        openingDate: "2026-03-01",
      });

      const updated = await storage.accounts.update(created.id, {
        showInTrajectory: false,
      });
      expect(updated?.showInTrajectory).toBe(false);

      const found = await storage.accounts.findById(created.id);
      expect(found?.showInTrajectory).toBe(false);
    });

    it("includes showInTrajectory in findAll and findAllWithBalance DTOs", async () => {
      await storage.accounts.create({
        kind: "Girokonto",
        name: "Hidden",
        openingBalance: 100000,
        openingDate: "2026-03-01",
        showInTrajectory: false,
      });

      const all = await storage.accounts.findAll();
      expect(all).toHaveLength(1);
      expect(all[0].showInTrajectory).toBe(false);

      const withBalance = await storage.accounts.findAllWithBalance();
      expect(withBalance).toHaveLength(1);
      expect(withBalance[0].showInTrajectory).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // Accounts — sort_order / reorder
  // -------------------------------------------------------------------------

  describe("AccountsRepo sort_order / reorder", () => {
    async function makeThree(): Promise<[Account, Account, Account]> {
      const a = await storage.accounts.create({
        kind: "Girokonto",
        name: "A",
        openingBalance: 100000,
        openingDate: "2026-03-01",
      });
      const b = await storage.accounts.create({
        kind: "Tagesgeld",
        name: "B",
        openingBalance: 200000,
        openingDate: "2026-03-01",
      });
      const c = await storage.accounts.create({
        kind: "Investment",
        name: "C",
        openingBalance: 300000,
        openingDate: "2026-03-01",
      });
      return [a, b, c];
    }

    it("reorder returns the accounts in the requested order", async () => {
      const [a, b, c] = await makeThree();

      const reordered = await storage.accounts.reorder([c.id, a.id, b.id]);

      expect(reordered.map((acc) => acc.id)).toEqual([c.id, a.id, b.id]);
    });

    it("findAll reflects the persisted order after a reorder", async () => {
      const [a, b, c] = await makeThree();

      await storage.accounts.reorder([b.id, c.id, a.id]);
      const all = await storage.accounts.findAll();

      expect(all.map((acc) => acc.id)).toEqual([b.id, c.id, a.id]);
    });

    it("findAllWithBalance reflects the same order as findAll (consistent across surfaces)", async () => {
      const [a, b, c] = await makeThree();

      await storage.accounts.reorder([c.id, b.id, a.id]);
      const withBalance = await storage.accounts.findAllWithBalance();

      expect(withBalance.map((acc) => acc.id)).toEqual([c.id, b.id, a.id]);
    });

    it("a newly created account appends to the end of the existing order", async () => {
      const [a, b, c] = await makeThree();

      await storage.accounts.reorder([c.id, b.id, a.id]);
      const d = await storage.accounts.create({
        kind: "Girokonto",
        name: "D",
        openingBalance: 400000,
        openingDate: "2026-03-01",
      });

      const all = await storage.accounts.findAll();
      expect(all.map((acc) => acc.id)).toEqual([c.id, b.id, a.id, d.id]);
    });

    it("the persisted order survives repeated reads (re-read after reorder is stable)", async () => {
      const [a, b, c] = await makeThree();

      await storage.accounts.reorder([b.id, a.id, c.id]);

      const first = (await storage.accounts.findAll()).map((acc) => acc.id);
      const second = (await storage.accounts.findAll()).map((acc) => acc.id);

      expect(first).toEqual([b.id, a.id, c.id]);
      expect(second).toEqual(first);
    });

    it("ignores ids that reference no existing account", async () => {
      const [a, b] = await makeThree();
      const unknownId = "00000000-0000-4000-8000-999999999999";

      await storage.accounts.reorder([b.id, unknownId, a.id]);
      const all = await storage.accounts.findAll();
      const knownOrder = all
        .map((acc) => acc.id)
        .filter((id) => id === a.id || id === b.id);

      expect(knownOrder).toEqual([b.id, a.id]);
    });
  });

  // -------------------------------------------------------------------------
  // Accounts — mortgage origination (setMortgageOrigination)
  // -------------------------------------------------------------------------

  describe("AccountsRepo mortgage origination", () => {
    // A Mortgage with no transactions has a current Restschuld equal to its
    // opening balance.
    async function makeMortgage(restschuld = 30000000): Promise<Account> {
      return storage.accounts.create({
        kind: "Mortgage",
        name: "Haus",
        openingBalance: restschuld,
        openingDate: "2026-01-01",
      });
    }

    it("persists originalPrincipal/startDate/termYears and round-trips through findById", async () => {
      const mortgage = await makeMortgage(30000000);

      const result = await storage.accounts.setMortgageOrigination(
        mortgage.id,
        {
          originalPrincipal: 45000000,
          startDate: "2020-06-01",
          termYears: 25,
        }
      );

      expect(result).not.toBeNull();
      expect(result!.ok).toBe(true);
      if (result!.ok) {
        expect(result!.account.originalPrincipal).toBe(45000000);
        expect(result!.account.startDate).toBe("2020-06-01");
        expect(result!.account.termYears).toBe(25);
      }

      const found = await storage.accounts.findById(mortgage.id);
      expect(found?.originalPrincipal).toBe(45000000);
      expect(found?.startDate).toBe("2020-06-01");
      expect(found?.termYears).toBe(25);
    });

    it("includes origination fields in findAll and findAllWithBalance DTOs", async () => {
      const mortgage = await makeMortgage(30000000);
      await storage.accounts.setMortgageOrigination(mortgage.id, {
        originalPrincipal: 50000000,
        startDate: "2019-03-01",
        termYears: 30,
      });

      const all = await storage.accounts.findAll();
      const fromAll = all.find((a) => a.id === mortgage.id);
      expect(fromAll?.originalPrincipal).toBe(50000000);
      expect(fromAll?.startDate).toBe("2019-03-01");
      expect(fromAll?.termYears).toBe(30);

      const withBalance = await storage.accounts.findAllWithBalance();
      const fromBalance = withBalance.find((a) => a.id === mortgage.id);
      expect(fromBalance?.originalPrincipal).toBe(50000000);
    });

    it("accepts an originalPrincipal exactly equal to the current Restschuld (boundary)", async () => {
      const mortgage = await makeMortgage(30000000);

      const result = await storage.accounts.setMortgageOrigination(
        mortgage.id,
        { originalPrincipal: 30000000, startDate: "2021-01-01", termYears: 20 }
      );

      expect(result?.ok).toBe(true);
    });

    it("rejects an originalPrincipal below the current Restschuld and persists nothing", async () => {
      const mortgage = await makeMortgage(30000000);

      const result = await storage.accounts.setMortgageOrigination(
        mortgage.id,
        { originalPrincipal: 29999999, startDate: "2021-01-01", termYears: 20 }
      );

      expect(result).toEqual({ ok: false, reason: "below_restschuld" });

      const found = await storage.accounts.findById(mortgage.id);
      expect(found?.originalPrincipal == null).toBe(true);
      expect(found?.startDate == null).toBe(true);
      expect(found?.termYears == null).toBe(true);
    });

    it("returns null for a non-Mortgage account", async () => {
      const giro = await storage.accounts.create({
        kind: "Girokonto",
        name: "Main",
        openingBalance: 100000,
        openingDate: "2026-01-01",
      });

      const result = await storage.accounts.setMortgageOrigination(giro.id, {
        originalPrincipal: 100000,
        startDate: "2021-01-01",
        termYears: 20,
      });

      expect(result).toBeNull();
    });

    it("returns null for an unknown account id", async () => {
      const result = await storage.accounts.setMortgageOrigination(
        "00000000-0000-4000-8000-999999999999",
        { originalPrincipal: 100000, startDate: "2021-01-01", termYears: 20 }
      );

      expect(result).toBeNull();
    });

    it("origination fields survive a backup and reopen", async () => {
      const mortgage = await makeMortgage(30000000);
      await storage.accounts.setMortgageOrigination(mortgage.id, {
        originalPrincipal: 45000000,
        startDate: "2020-06-01",
        termYears: 25,
      });

      const dir = fs.mkdtempSync(path.join(os.tmpdir(), "horizon-mortgage-"));
      const destPath = path.join(dir, "snapshot.db");
      try {
        await storage.backup(destPath);

        const restored = await createStorage({ path: destPath });
        try {
          const found = await restored.accounts.findById(mortgage.id);
          expect(found?.originalPrincipal).toBe(45000000);
          expect(found?.startDate).toBe("2020-06-01");
          expect(found?.termYears).toBe(25);
        } finally {
          await restored.close();
        }
      } finally {
        fs.rmSync(dir, { recursive: true, force: true });
      }
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

  describe("TransactionsRepo.findByDateRange", () => {
    it("returns transactions in the half-open span — lower inclusive, upper exclusive — across accounts, in date order", async () => {
      const a = await makeAccount({ name: "A" });
      const b = await makeAccount({ name: "B" });

      const seed = async (
        accountId: string,
        date: string,
        description: string
      ) => {
        await storage.transactions.create(accountId, {
          date,
          amount: -100,
          description,
          category: "Food",
        });
      };

      // Just below the lower bound — excluded.
      await seed(a.id, "2025-12-31", "before");
      // Exactly the lower bound — included.
      await seed(a.id, "2026-01-01", "lower-bound");
      // Mid-span, on the other account — included, proves cross-account.
      await seed(b.id, "2026-02-10", "mid-other-account");
      await seed(a.id, "2026-03-15", "mid");
      // Last day inside the span — included.
      await seed(a.id, "2026-06-30", "last-in");
      // Exactly the upper bound — excluded.
      await seed(b.id, "2026-07-01", "upper-bound");

      const rows = await storage.transactions.findByDateRange(
        "2026-01-01",
        "2026-07-01"
      );

      expect(rows.map((t) => t.date)).toEqual([
        "2026-01-01",
        "2026-02-10",
        "2026-03-15",
        "2026-06-30",
      ]);
      expect(rows.map((t) => t.description)).toEqual([
        "lower-bound",
        "mid-other-account",
        "mid",
        "last-in",
      ]);
    });

    it("returns an empty array when no transactions fall in the span", async () => {
      const account = await makeAccount();
      await storage.transactions.create(account.id, {
        date: "2026-01-15",
        amount: -100,
        description: "outside",
        category: "Food",
      });

      const rows = await storage.transactions.findByDateRange(
        "2027-01-01",
        "2027-02-01"
      );
      expect(rows).toEqual([]);
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
      const cat = await createCategory("Vet");

      expect(cat.name).toBe("Vet");
      expect(cat.isDefault).toBe(false);
      expect(typeof cat.id).toBe("string");
    });
  });

  describe("CategoriesRepo.delete", () => {
    it("returns { ok: true } and removes a custom category with no transactions", async () => {
      const created = await createCategory("Vet");

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
      const created = await createCategory("Vet");

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
  // Categories — color (issue #134)
  //
  // Every Category carries a deterministic hex `color`, auto-seeded from
  // accountColorPalette on insert with a per-name fallback for rows that have
  // no stored colour (the SQL-seeded defaults). The colour is a pure function
  // of the category name — same name → same colour, stable across reads and
  // across a backup/reopen. Format + determinism are asserted; exact palette
  // values are intentionally not pinned.
  // -------------------------------------------------------------------------

  describe("CategoriesRepo color", () => {
    const HEX = /^#[0-9a-fA-F]{6}$/;

    it("assigns a hex colour to every seeded default category", async () => {
      const all = await storage.categories.findAll();
      const defaults = all.filter((c) =>
        (DEFAULT_CATEGORY_NAMES as readonly string[]).includes(c.name)
      );

      expect(defaults).toHaveLength(DEFAULT_CATEGORY_NAMES.length);
      for (const cat of defaults) {
        expect(cat.color).toMatch(HEX);
      }
    });

    it("assigns a hex colour to a newly created category and findAll returns the same value", async () => {
      const created = await createCategory("Vet");

      expect(created.color).toMatch(HEX);

      const all = await storage.categories.findAll();
      const fromAll = all.find((c) => c.name === "Vet");
      expect(fromAll?.color).toBe(created.color);
    });

    it("derives the colour deterministically from the name (delete + recreate is identical)", async () => {
      const first = await createCategory("Vet");
      const firstColor = first.color;
      expect(firstColor).toMatch(HEX);

      const deleted = await storage.categories.delete(first.id);
      expect(deleted).toEqual({ ok: true });

      const second = await createCategory("Vet");
      expect(second.color).toBe(firstColor);
    });

    it("returns a stable colour for the same name across repeated reads", async () => {
      const firstRead = await storage.categories.findAll();
      const secondRead = await storage.categories.findAll();

      const foodA = firstRead.find((c) => c.name === "Food");
      const foodB = secondRead.find((c) => c.name === "Food");

      expect(foodA?.color).toMatch(HEX);
      expect(foodB?.color).toBe(foodA?.color);
    });

    it("round-trips the colour through a backup and reopen", async () => {
      const created = await createCategory("Vet");
      const expectedColor = created.color;
      expect(expectedColor).toMatch(HEX);

      const dir = fs.mkdtempSync(path.join(os.tmpdir(), "horizon-cat-color-"));
      const destPath = path.join(dir, "snapshot.db");
      try {
        await storage.backup(destPath);

        const restored = await createStorage({ path: destPath });
        try {
          const all = await restored.categories.findAll();
          const vet = all.find((c) => c.name === "Vet");
          expect(vet?.color).toBe(expectedColor);
        } finally {
          await restored.close();
        }
      } finally {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    });
  });

  // -------------------------------------------------------------------------
  // Categories — hidden (issue #157)
  //
  // Every Category DTO now carries a `hidden` boolean alongside its `color`.
  // On a fresh install every category is hidden = false, so an untouched
  // install reads exactly as it did before Category Management. (The colour
  // NULL-fallback is already covered by the "CategoriesRepo color" block.)
  // -------------------------------------------------------------------------

  describe("CategoriesRepo hidden", () => {
    it("returns hidden: false for every seeded default category", async () => {
      const all = await storage.categories.findAll();
      const defaults = all.filter((c) =>
        (DEFAULT_CATEGORY_NAMES as readonly string[]).includes(c.name)
      );

      expect(defaults).toHaveLength(DEFAULT_CATEGORY_NAMES.length);
      for (const cat of defaults) {
        expect(cat.hidden).toBe(false);
      }
    });

    it("returns hidden: false from create for a new custom category", async () => {
      const created = await createCategory("Vet");
      expect(created.hidden).toBe(false);

      const all = await storage.categories.findAll();
      const fromAll = all.find((c) => c.name === "Vet");
      expect(fromAll?.hidden).toBe(false);
    });

    it("exposes hidden as a boolean on every findAll DTO", async () => {
      const all = await storage.categories.findAll();
      expect(all.length).toBeGreaterThan(0);
      for (const cat of all) {
        expect(typeof cat.hidden).toBe("boolean");
      }
    });
  });

  // -------------------------------------------------------------------------
  // Categories — recolor (issue #158)
  //
  // `recolor(id, color)` overwrites the stored colour and returns the updated
  // Category. It is allowed on defaults (recolour is one of the two operations
  // a default supports) and returns null for an unknown / unparseable id.
  // -------------------------------------------------------------------------

  describe("CategoriesRepo.recolor", () => {
    const NEW_COLOR = "#6FBFBF";

    it("updates a custom category's colour and findAll reflects it", async () => {
      const created = await createCategory("Vet");
      expect(created.color).not.toBe(NEW_COLOR);

      await storage.categories.recolor(created.id, NEW_COLOR);

      const all = await storage.categories.findAll();
      const fromAll = all.find((c) => c.name === "Vet");
      expect(fromAll?.color).toBe(NEW_COLOR);
    });

    it("is allowed on a default category", async () => {
      const all = await storage.categories.findAll();
      const food = all.find((c) => c.name === "Food");
      expect(food).toBeDefined();

      const updated = await storage.categories.recolor(food!.id, NEW_COLOR);

      expect(updated).not.toBeNull();
      expect(updated?.color).toBe(NEW_COLOR);

      const reread = await storage.categories.findAll();
      expect(reread.find((c) => c.name === "Food")?.color).toBe(NEW_COLOR);
    });

    it("returns the updated Category carrying the new colour", async () => {
      const created = await createCategory("Vet");

      const updated = await storage.categories.recolor(created.id, NEW_COLOR);

      expect(updated).not.toBeNull();
      expect(updated?.id).toBe(created.id);
      expect(updated?.name).toBe("Vet");
      expect(updated?.color).toBe(NEW_COLOR);
    });

    it("returns null for an unparseable id", async () => {
      const result = await storage.categories.recolor("not-an-id", NEW_COLOR);
      expect(result).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // Categories — add a Custom Category (issue #159)
  //
  // `create` now carries an explicit chosen colour and returns a discriminated
  // union: { ok: true, category } on success, { ok: false, reason } on a
  // rejected create. The chosen colour is authoritative from creation (no
  // name-hash), the name is trimmed and truncated to 40 chars, empty /
  // whitespace-only names are rejected as "invalid_name", and any
  // case-insensitive collision with an existing category — default or custom —
  // is rejected as "collision" (never a silent merge).
  // -------------------------------------------------------------------------

  describe("CategoriesRepo.create — chosen colour, validation & collisions", () => {
    const CHOSEN_COLOR = "#6FBFBF"; // a palette swatch, distinct from Vet's name-hash

    it("stores the chosen colour rather than deriving it from the name", async () => {
      const result = await storage.categories.create({
        name: "Vet",
        color: CHOSEN_COLOR,
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.category.color).toBe(CHOSEN_COLOR);

      const all = await storage.categories.findAll();
      expect(all.find((c) => c.name === "Vet")?.color).toBe(CHOSEN_COLOR);
    });

    it("returns a custom category with isDefault: false and hidden: false", async () => {
      const result = await storage.categories.create({
        name: "Vet",
        color: CHOSEN_COLOR,
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.category.isDefault).toBe(false);
      expect(result.category.hidden).toBe(false);
      expect(typeof result.category.id).toBe("string");
    });

    it("trims surrounding whitespace from the name", async () => {
      const result = await storage.categories.create({
        name: "  Vet  ",
        color: CHOSEN_COLOR,
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.category.name).toBe("Vet");
    });

    it("truncates a name longer than 40 characters to its first 40 characters", async () => {
      const longName = "A".repeat(45);
      const result = await storage.categories.create({
        name: longName,
        color: CHOSEN_COLOR,
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.category.name).toBe("A".repeat(40));
    });

    it('rejects an empty / whitespace-only name with reason "invalid_name"', async () => {
      const before = await storage.categories.findAll();

      const result = await storage.categories.create({
        name: "   ",
        color: CHOSEN_COLOR,
      });

      expect(result).toEqual({ ok: false, reason: "invalid_name" });

      const after = await storage.categories.findAll();
      expect(after).toHaveLength(before.length);
    });

    it('rejects a case-insensitive collision with a default category with reason "collision"', async () => {
      const before = await storage.categories.findAll();

      const result = await storage.categories.create({
        name: "food", // seeded default is "Food"
        color: CHOSEN_COLOR,
      });

      expect(result).toEqual({ ok: false, reason: "collision" });

      const after = await storage.categories.findAll();
      expect(after).toHaveLength(before.length);
    });

    it('rejects a case-insensitive collision with an existing custom category with reason "collision"', async () => {
      await createCategory("Vet");

      const result = await storage.categories.create({
        name: "VET",
        color: CHOSEN_COLOR,
      });

      expect(result).toEqual({ ok: false, reason: "collision" });

      const all = await storage.categories.findAll();
      expect(all.filter((c) => c.name.toLowerCase() === "vet")).toHaveLength(1);
    });

    it("treats the trimmed name when checking a collision", async () => {
      const result = await storage.categories.create({
        name: "  Food  ",
        color: CHOSEN_COLOR,
      });

      expect(result).toEqual({ ok: false, reason: "collision" });
    });
  });

  // -------------------------------------------------------------------------
  // Categories — rename a Custom Category (issue #160)
  //
  // `rename(id, name)` is the Category Reassignment primitive: in one atomic
  // transaction it updates the `categories` row and every `transactions` and
  // `recurring_transactions` row holding the old name, so no spending is
  // stranded under the old label. It returns null for an unparseable / unknown
  // id, and a { ok: false, reason } union for a rejected rename — default
  // (is_default), case-insensitive collision, or invalid name — surfacing the
  // reason rather than silently succeeding. The new name is trimmed and capped
  // at 40 chars, exactly like create.
  // -------------------------------------------------------------------------

  describe("CategoriesRepo.rename", () => {
    it("renames a custom category and findAll reflects the new name", async () => {
      const vet = await createCategory("Vet");

      const result = await storage.categories.rename(vet.id, "Pets");

      expect(result).not.toBeNull();
      expect(result).toMatchObject({ ok: true });
      if (!result || !result.ok) return;
      expect(result.category.id).toBe(vet.id);
      expect(result.category.name).toBe("Pets");

      const all = await storage.categories.findAll();
      expect(all.find((c) => c.id === vet.id)?.name).toBe("Pets");
      expect(all.find((c) => c.name === "Vet")).toBeUndefined();
    });

    it("cascades the new name to every transaction holding the old name", async () => {
      const vet = await createCategory("Vet");
      const account = await makeAccount();

      await storage.transactions.create(account.id, {
        date: "2026-03-01",
        amount: -6425,
        description: "Lassie",
        category: "Vet",
      });
      await storage.transactions.create(account.id, {
        date: "2026-03-08",
        amount: -1999,
        description: "Cat food",
        category: "Vet",
      });

      await storage.categories.rename(vet.id, "Pets");

      const txs = await storage.transactions.findAll();
      expect(txs.every((t) => t.category !== "Vet")).toBe(true);
      expect(txs.filter((t) => t.category === "Pets")).toHaveLength(2);
    });

    it("cascades the new name to every recurring transaction holding the old name", async () => {
      const vet = await createCategory("Vet");
      const account = await makeAccount();

      await storage.recurringTransactions.create({
        accountId: account.id,
        amount: -1999,
        description: "Monthly cat food",
        category: "Vet",
        frequency: "monthly",
        dayOfMonth: 1,
      });

      await storage.categories.rename(vet.id, "Pets");

      const recurring = await storage.recurringTransactions.findAll();
      expect(recurring.every((r) => r.category !== "Vet")).toBe(true);
      expect(recurring.filter((r) => r.category === "Pets")).toHaveLength(1);
    });

    it("cascades across transactions and recurring transactions in one call", async () => {
      const vet = await createCategory("Vet");
      const account = await makeAccount();

      await storage.transactions.create(account.id, {
        date: "2026-03-01",
        amount: -6425,
        description: "Lassie",
        category: "Vet",
      });
      await storage.recurringTransactions.create({
        accountId: account.id,
        amount: -1999,
        description: "Monthly cat food",
        category: "Vet",
        frequency: "monthly",
        dayOfMonth: 1,
      });

      await storage.categories.rename(vet.id, "Pets");

      const txs = await storage.transactions.findAll();
      const recurring = await storage.recurringTransactions.findAll();
      expect(txs.find((t) => t.description === "Lassie")?.category).toBe(
        "Pets"
      );
      expect(
        recurring.find((r) => r.description === "Monthly cat food")?.category
      ).toBe("Pets");
    });

    it("trims and truncates the new name to 40 characters", async () => {
      const vet = await createCategory("Vet");

      const result = await storage.categories.rename(
        vet.id,
        `  ${"P".repeat(45)}  `
      );

      expect(result).toMatchObject({ ok: true });
      if (!result || !result.ok) return;
      expect(result.category.name).toBe("P".repeat(40));
    });

    it("returns null for an unparseable id", async () => {
      const result = await storage.categories.rename("not-an-id", "Pets");
      expect(result).toBeNull();
    });

    it("returns null for a well-formed but unknown id", async () => {
      const result = await storage.categories.rename(
        "00000000-0000-0000-0000-000000000000",
        "Pets"
      );
      expect(result).toBeNull();
    });

    it('rejects renaming a default category with reason "is_default"', async () => {
      const all = await storage.categories.findAll();
      const food = all.find((c) => c.name === "Food");
      expect(food).toBeDefined();

      const result = await storage.categories.rename(food!.id, "Groceries");

      expect(result).toEqual({ ok: false, reason: "is_default" });
      const after = await storage.categories.findAll();
      expect(after.find((c) => c.name === "Food")).toBeDefined();
      expect(after.find((c) => c.name === "Groceries")).toBeUndefined();
    });

    it('rejects a case-insensitive collision with reason "collision"', async () => {
      const vet = await createCategory("Vet");
      await createCategory("Pets");

      const result = await storage.categories.rename(vet.id, "PETS");

      expect(result).toEqual({ ok: false, reason: "collision" });
      const all = await storage.categories.findAll();
      expect(all.find((c) => c.id === vet.id)?.name).toBe("Vet");
    });

    it('rejects an empty / whitespace-only name with reason "invalid_name"', async () => {
      const vet = await createCategory("Vet");

      const result = await storage.categories.rename(vet.id, "   ");

      expect(result).toEqual({ ok: false, reason: "invalid_name" });
      const all = await storage.categories.findAll();
      expect(all.find((c) => c.id === vet.id)?.name).toBe("Vet");
    });

    it("strands no data when a rename is rejected — the old name stays on transactions", async () => {
      const vet = await createCategory("Vet");
      await createCategory("Pets");
      const account = await makeAccount();

      await storage.transactions.create(account.id, {
        date: "2026-03-01",
        amount: -6425,
        description: "Lassie",
        category: "Vet",
      });

      const result = await storage.categories.rename(vet.id, "Pets");
      expect(result).toEqual({ ok: false, reason: "collision" });

      const txs = await storage.transactions.findAll();
      expect(txs.find((t) => t.description === "Lassie")?.category).toBe("Vet");
    });

    it("renaming a category to a new name is idempotent when re-renaming back", async () => {
      const vet = await createCategory("Vet");

      await storage.categories.rename(vet.id, "Pets");
      const back = await storage.categories.rename(vet.id, "Vet");

      expect(back).toMatchObject({ ok: true });
      const all = await storage.categories.findAll();
      expect(all.find((c) => c.id === vet.id)?.name).toBe("Vet");
    });
  });

  // -------------------------------------------------------------------------
  // RecurringTransactions
  // -------------------------------------------------------------------------

  describe("RecurringTransactionsRepo.create", () => {
    it("returns a DTO with string id and correct fields", async () => {
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
    it("returns all rows", async () => {
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
    it("returns all rows (all recurring transactions are always active)", async () => {
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

      const active = await storage.recurringTransactions.findActive();
      expect(active).toHaveLength(2);
      const ids = active.map((r) => r.id);
      expect(ids).toContain(a.id);
      expect(ids).toContain(b.id);
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
  // Imports (issue #140) — ImportsRepo
  //
  // A committed set of already-parsed rows becomes import_id-tagged Variable
  // Spending transactions plus one `imports` history record, written in a
  // single atomic transaction. The history record carries derived metadata
  // (date range, row count). Deleting an import cascades to its transactions
  // while leaving hand-entered spend untouched. Signs are preserved exactly as
  // supplied — a positive credit row becomes a positive transaction.
  // -------------------------------------------------------------------------

  const sampleImportRows = [
    {
      date: "2026-03-05",
      amount: -1299,
      description: "REWE",
      category: "Food",
    },
    {
      date: "2026-03-12",
      amount: 250000,
      description: "Gehalt",
      category: "Income",
    },
    {
      date: "2026-03-20",
      amount: -4500,
      description: "Deutsche Bahn",
      category: "Miscellaneous",
    },
  ];

  function makeImportInput(
    accountId: string,
    overrides: Partial<{
      bank: string;
      filename: string;
      sizeBytes: number;
      rows: typeof sampleImportRows;
    }> = {}
  ) {
    return {
      accountId,
      bank: "dkb",
      filename: "dkb-2026-03.csv",
      sizeBytes: 4096,
      rows: sampleImportRows,
      ...overrides,
    };
  }

  describe("ImportsRepo.create", () => {
    it("returns an ImportRecord DTO with derived date range, row count, and echoed metadata", async () => {
      const account = await makeAccount();

      const created = await storage.imports.create(makeImportInput(account.id));

      expect(created).not.toBeNull();
      expect(typeof created?.id).toBe("string");
      expect(created?.accountId).toBe(account.id);
      expect(created?.bank).toBe("dkb");
      expect(created?.filename).toBe("dkb-2026-03.csv");
      expect(created?.sizeBytes).toBe(4096);
      expect(created?.rowCount).toBe(3);
      expect(created?.startDate).toBe("2026-03-05");
      expect(created?.endDate).toBe("2026-03-20");
      expect(typeof created?.importedAt).toBe("string");
      expect(created!.importedAt.length).toBeGreaterThan(0);
    });

    it("persists one transaction per row, each tagged with the import_id", async () => {
      const account = await makeAccount();

      const created = await storage.imports.create(makeImportInput(account.id));
      const txs = await storage.transactions.findByAccount(account.id);

      expect(txs).toHaveLength(3);
      expect(txs.every((t) => t.importId === created!.id)).toBe(true);
    });

    it("preserves signs exactly: a positive credit row persists as a positive transaction", async () => {
      const account = await makeAccount();

      await storage.imports.create(makeImportInput(account.id));
      const txs = await storage.transactions.findByAccount(account.id);
      const amounts = txs.map((t) => t.amount).sort((a, b) => a - b);

      expect(amounts).toEqual([-4500, -1299, 250000]);
    });

    it("tags imported rows with import_id while hand-entered spend in the same account stays NULL", async () => {
      const account = await makeAccount();

      const manual = await storage.transactions.create(account.id, {
        date: "2026-03-01",
        amount: -1000,
        description: "Coffee",
        category: "Food",
      });
      const created = await storage.imports.create(makeImportInput(account.id));

      const txs = await storage.transactions.findByAccount(account.id);
      const byId = new Map(txs.map((t) => [t.id, t]));

      // Hand-entered spend: import_id NULL → undefined on the DTO.
      expect(byId.get(manual!.id)?.importId).toBeUndefined();
      // Every imported row carries this import's id.
      const imported = txs.filter((t) => t.id !== manual!.id);
      expect(imported).toHaveLength(3);
      expect(imported.every((t) => t.importId === created!.id)).toBe(true);
    });

    it("is atomic: returns null and persists nothing for a well-formed but unknown accountId", async () => {
      const unknownId = "00000000-0000-4000-8000-999999999999";

      let result: Awaited<ReturnType<typeof storage.imports.create>> | null =
        null;
      try {
        result = await storage.imports.create(makeImportInput(unknownId));
      } catch {
        result = null;
      }

      expect(result).toBeNull();
      expect(await storage.transactions.findAll()).toEqual([]);
      expect(await storage.imports.findAll()).toEqual([]);
    });

    it("returns null for an unparseable accountId", async () => {
      let result: Awaited<ReturnType<typeof storage.imports.create>> | null =
        null;
      try {
        result = await storage.imports.create(makeImportInput("not-an-id"));
      } catch {
        result = null;
      }

      expect(result).toBeNull();
      expect(await storage.imports.findAll()).toEqual([]);
    });
  });

  describe("ImportsRepo.findAll / findByAccount", () => {
    it("findAll returns every import across accounts", async () => {
      const a = await makeAccount({ name: "A" });
      const b = await makeAccount({ name: "B" });
      await storage.imports.create(makeImportInput(a.id));
      await storage.imports.create(
        makeImportInput(b.id, { filename: "b.csv" })
      );

      const all = await storage.imports.findAll();
      expect(all).toHaveLength(2);
    });

    it("findByAccount returns only the given account's imports", async () => {
      const a = await makeAccount({ name: "A" });
      const b = await makeAccount({ name: "B" });
      await storage.imports.create(makeImportInput(a.id));
      await storage.imports.create(
        makeImportInput(b.id, { filename: "b.csv" })
      );

      const forA = await storage.imports.findByAccount(a.id);
      expect(forA).toHaveLength(1);
      expect(forA[0].accountId).toBe(a.id);
    });

    it("findByAccount returns an empty array for an account with no imports", async () => {
      const account = await makeAccount();
      const list = await storage.imports.findByAccount(account.id);
      expect(list).toEqual([]);
    });
  });

  describe("ImportsRepo.findTransactions", () => {
    it("returns the persisted, import_id-tagged rows of a past import", async () => {
      const account = await makeAccount();
      const created = await storage.imports.create(makeImportInput(account.id));

      const txs = await storage.imports.findTransactions(created!.id);

      expect(txs).toHaveLength(3);
      expect(txs.every((t) => t.importId === created!.id)).toBe(true);
      const descriptions = txs.map((t) => t.description).sort();
      expect(descriptions).toEqual(["Deutsche Bahn", "Gehalt", "REWE"]);
    });

    it("returns an empty array for an unknown importId", async () => {
      const txs = await storage.imports.findTransactions(
        "00000000-0000-4000-8000-999999999999"
      );
      expect(txs).toEqual([]);
    });
  });

  describe("ImportsRepo.delete (cascade)", () => {
    it("removes the import and all its tagged transactions and returns true", async () => {
      const account = await makeAccount();
      const created = await storage.imports.create(makeImportInput(account.id));

      const result = await storage.imports.delete(created!.id);

      expect(result).toBe(true);
      expect(await storage.imports.findAll()).toEqual([]);
      expect(await storage.transactions.findByAccount(account.id)).toEqual([]);
    });

    it("leaves hand-entered Variable Spending (import_id NULL) untouched", async () => {
      const account = await makeAccount();

      const manual = await storage.transactions.create(account.id, {
        date: "2026-03-02",
        amount: -800,
        description: "Cat food",
        category: "Food",
      });
      const created = await storage.imports.create(makeImportInput(account.id));

      await storage.imports.delete(created!.id);

      const remaining = await storage.transactions.findByAccount(account.id);
      expect(remaining).toHaveLength(1);
      expect(remaining[0].id).toBe(manual!.id);
      expect(remaining[0].importId).toBeUndefined();
    });

    it("returns false for an unknown importId", async () => {
      const result = await storage.imports.delete(
        "00000000-0000-4000-8000-999999999999"
      );
      expect(result).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // Imports (issue #140) — ImportPresetsRepo
  //
  // Remembered per-bank column mappings live in the import_presets DB table so
  // they survive restart, reinstall, and backup/restore. upsert/get round-trip
  // the mapping; a second upsert overwrites the prior one for the same bank.
  // -------------------------------------------------------------------------

  describe("ImportPresetsRepo", () => {
    const dkbPreset = {
      mapping: {
        date: "Buchungstag",
        description: "Verwendungszweck",
        amount: "Betrag",
      },
      delimiter: ";",
      decimal: ",",
      dateFmt: "DD.MM.YYYY",
    };

    it("get returns null when no preset exists for the bank", async () => {
      const preset = await storage.importPresets.get("dkb");
      expect(preset).toBeNull();
    });

    it("upsert then get round-trips the full preset (mapping + format)", async () => {
      await storage.importPresets.upsert("dkb", dkbPreset);

      const preset = await storage.importPresets.get("dkb");
      expect(preset).toEqual(dkbPreset);
    });

    it("upsert overwrites the preset for an existing bank", async () => {
      await storage.importPresets.upsert("dkb", dkbPreset);
      const adjusted = {
        mapping: {
          date: "Wertstellung",
          description: "Buchungstext",
          amount: "Umsatz",
        },
        delimiter: ",",
        decimal: ".",
        dateFmt: "YYYY-MM-DD",
      };
      await storage.importPresets.upsert("dkb", adjusted);

      const preset = await storage.importPresets.get("dkb");
      expect(preset).toEqual(adjusted);
    });

    it("a remembered preset survives a backup and reopen", async () => {
      await storage.importPresets.upsert("dkb", dkbPreset);

      const dir = fs.mkdtempSync(path.join(os.tmpdir(), "horizon-preset-"));
      const destPath = path.join(dir, "snapshot.db");
      try {
        await storage.backup(destPath);

        const restored = await createStorage({ path: destPath });
        try {
          const preset = await restored.importPresets.get("dkb");
          expect(preset).toEqual(dkbPreset);
        } finally {
          await restored.close();
        }
      } finally {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    });
  });

  // -------------------------------------------------------------------------
  // Storage.backup
  // -------------------------------------------------------------------------

  describe("Storage.backup", () => {
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
        // shape the parent PRD specifies (createStorage({ path })).
        const restored = await createStorage({ path: destPath });
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
        const restored = await createStorage({ path: destPath });
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
  });

  // -------------------------------------------------------------------------
  // Storage.restore
  // -------------------------------------------------------------------------

  describe("Storage.restore", () => {
    // The SQLite restore tests need a file-backed live storage — "swap the
    // file in and reopen" has no meaning against a :memory: DB. Each test
    // owns its own tempfile lifecycle so the parity fixture (still :memory:)
    // is untouched and remains green.
    it("restores live data from a valid backup and the live handle keeps serving queries", async () => {
      const liveDir = fs.mkdtempSync(
        path.join(os.tmpdir(), "horizon-restore-live-")
      );
      const snapDir = fs.mkdtempSync(
        path.join(os.tmpdir(), "horizon-restore-snap-")
      );
      const livePath = path.join(liveDir, "horizon.db");
      const snapPath = path.join(snapDir, "snapshot.db");
      const live = await createStorage({ path: livePath });
      try {
        // Seed known state, snapshot it.
        const seedAcc = await live.accounts.create({
          kind: "Tagesgeld",
          name: "Seed",
          openingBalance: 200000,
          openingDate: "2026-04-01",
        });
        const seedTx = await live.transactions.create(seedAcc.id, {
          date: "2026-04-15",
          amount: -1000,
          description: "Coffee",
          category: "Food",
        });
        await live.backup(snapPath);

        // Diverge the live DB after the snapshot is taken.
        const drift = await live.accounts.create({
          kind: "Girokonto",
          name: "Drift",
          openingBalance: 50000,
          openingDate: "2026-04-20",
        });
        const deleteResult = await live.transactions.delete(seedTx!.id);
        expect(deleteResult).toEqual({ ok: true });

        // Restore from the snapshot — live handle continues to be used.
        await live.restore(snapPath);

        // Live data after restore matches the snapshot exactly.
        const accountsAfter = await live.accounts.findAll();
        const accIds = accountsAfter.map((a) => a.id);
        expect(accIds).toContain(seedAcc.id);
        expect(accIds).not.toContain(drift.id);

        const txsAfter = await live.transactions.findAll();
        expect(txsAfter).toHaveLength(1);
        expect(txsAfter[0].id).toBe(seedTx!.id);
        expect(txsAfter[0].description).toBe("Coffee");

        // Same handle still serves a follow-up write — the AC's "live
        // Storage handle continues to serve queries via a freshly reopened
        // connection".
        const post = await live.accounts.create({
          kind: "Girokonto",
          name: "Post-restore",
          openingBalance: 1,
          openingDate: "2026-04-25",
        });
        const finalAccs = await live.accounts.findAll();
        expect(finalAccs.map((a) => a.id)).toContain(post.id);
      } finally {
        await live.close();
        fs.rmSync(liveDir, { recursive: true, force: true });
        fs.rmSync(snapDir, { recursive: true, force: true });
      }
    });

    it("rejects a corrupt source with StorageIntegrityError and leaves the live database untouched", async () => {
      const liveDir = fs.mkdtempSync(
        path.join(os.tmpdir(), "horizon-restore-live-")
      );
      const corruptDir = fs.mkdtempSync(
        path.join(os.tmpdir(), "horizon-restore-corrupt-")
      );
      const livePath = path.join(liveDir, "horizon.db");
      const corruptPath = path.join(corruptDir, "corrupt.db");
      const live = await createStorage({ path: livePath });
      try {
        const liveAcc = await live.accounts.create({
          kind: "Girokonto",
          name: "Untouched",
          openingBalance: 999000,
          openingDate: "2026-04-01",
        });

        // Build a corrupt source file: a real SQLite DB whose B-tree pages
        // have been overwritten — the SQLite header still parses but
        // PRAGMA integrity_check fails. Same trick as connection.test.ts.
        const seed = await createStorage({ path: corruptPath });
        await seed.accounts.create({
          kind: "Tagesgeld",
          name: "Seed",
          openingBalance: 1,
          openingDate: "2026-04-01",
        });
        await seed.close();
        const buf = fs.readFileSync(corruptPath);
        for (let i = 2000; i < 3000 && i < buf.length; i++) {
          buf[i] = 0xff;
        }
        fs.writeFileSync(corruptPath, buf);

        await expect(live.restore(corruptPath)).rejects.toBeInstanceOf(
          StorageIntegrityError
        );

        // The live DB must still serve its pre-restore data — the
        // validation failure must happen before any file swap.
        const stillThere = await live.accounts.findById(liveAcc.id);
        expect(stillThere?.id).toBe(liveAcc.id);
        expect(stillThere?.name).toBe("Untouched");
      } finally {
        await live.close();
        fs.rmSync(liveDir, { recursive: true, force: true });
        fs.rmSync(corruptDir, { recursive: true, force: true });
      }
    });

    it("rejects a future-schema source with StorageIntegrityError and leaves the live database untouched", async () => {
      const liveDir = fs.mkdtempSync(
        path.join(os.tmpdir(), "horizon-restore-live-")
      );
      const futureDir = fs.mkdtempSync(
        path.join(os.tmpdir(), "horizon-restore-future-")
      );
      const livePath = path.join(liveDir, "horizon.db");
      const futurePath = path.join(futureDir, "future.db");
      const live = await createStorage({ path: livePath });
      try {
        const liveAcc = await live.accounts.create({
          kind: "Girokonto",
          name: "Untouched",
          openingBalance: 999000,
          openingDate: "2026-04-01",
        });

        // Build a source whose user_version is far ahead of the latest
        // shipped migration. integrity_check returns ok, but user_version
        // says "this DB was written by a newer build" — restore must
        // refuse for the same reason openConnection refuses (see
        // connection.test.ts "throws StorageIntegrityError on a future
        // user_version").
        const futureDb = new Database(futurePath);
        futureDb.pragma("user_version = 9999");
        futureDb.close();

        await expect(live.restore(futurePath)).rejects.toBeInstanceOf(
          StorageIntegrityError
        );

        const stillThere = await live.accounts.findById(liveAcc.id);
        expect(stillThere?.id).toBe(liveAcc.id);
        expect(stillThere?.name).toBe("Untouched");
      } finally {
        await live.close();
        fs.rmSync(liveDir, { recursive: true, force: true });
        fs.rmSync(futureDir, { recursive: true, force: true });
      }
    });
  });

  // -------------------------------------------------------------------------
  // Storage.status
  // -------------------------------------------------------------------------

  describe("Storage.status", () => {
    it("returns the SQLite-shaped status payload with driver, schemaVersion, integrity, path, sizeBytes", async () => {
      const status = await storage.status();

      expect(status.driver).toBe("sqlite");
      expect(typeof status.schemaVersion).toBe("number");
      expect(status.schemaVersion).toBeGreaterThan(0);
      expect(status.integrity).toBe("ok");
      expect(status.path).toBe(":memory:");
      expect(typeof status.sizeBytes).toBe("number");
      expect(status.sizeBytes).toBeGreaterThanOrEqual(0);
    });
  });
}

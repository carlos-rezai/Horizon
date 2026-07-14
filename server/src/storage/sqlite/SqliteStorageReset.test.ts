import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import { createStorage } from "../index.js";
import type { Storage } from "../Storage.js";

// ---------------------------------------------------------------------------
// reset() — SQLite driver, verified against a real on-disk temp-file database
// (not :memory:), per the "New storage primitive" decision in the plan.
// ---------------------------------------------------------------------------

const DEFAULT_CATEGORY_NAMES = [
  "Income",
  "Housing",
  "Food",
  "Subscriptions",
  "Entertainment",
  "Investment",
  "Transfer",
  "Miscellaneous",
];

describe("reset() — SQLite driver (real temp-file database)", () => {
  let storage: Storage;
  let dbPath: string;
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "horizon-reset-"));
    dbPath = path.join(tmpDir, "horizon.db");
    storage = await createStorage({ path: dbPath });
  });

  afterEach(async () => {
    await storage.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  async function seedFullDatabase(): Promise<void> {
    const account = await storage.accounts.create({
      name: "Everyday",
      kind: "Girokonto",
      openingBalance: 100000,
      openingDate: "2026-01-01",
    });

    await storage.transactions.create(account.id, {
      date: "2026-01-05",
      amount: -2500,
      description: "Groceries",
      category: "Food",
    });

    await storage.recurringTransactions.create({
      accountId: account.id,
      amount: 300000,
      description: "Salary",
      category: "Income",
      frequency: "monthly",
      dayOfMonth: 1,
    });

    await storage.imports.create({
      accountId: account.id,
      bank: "Sparkasse",
      filename: "statement.csv",
      sizeBytes: 1024,
      rows: [
        {
          date: "2026-01-10",
          amount: -1200,
          description: "Cat food",
          category: "Food",
        },
      ],
    });

    await storage.importPresets.upsert("Sparkasse", {
      mapping: {
        date: "Buchungstag",
        description: "Verwendungszweck",
        amount: "Betrag",
      },
      delimiter: ";",
      decimal: ",",
      dateFmt: "DD.MM.YYYY",
    });
  }

  it("leaves zero accounts and transactions while the default seeded categories remain", async () => {
    await seedFullDatabase();

    await storage.reset();

    expect(await storage.accounts.findAll()).toHaveLength(0);
    expect(await storage.transactions.findAll()).toHaveLength(0);

    const categories = await storage.categories.findAll();
    expect(categories.map((c) => c.name).sort()).toEqual(
      [...DEFAULT_CATEGORY_NAMES].sort()
    );
    expect(categories.every((c) => c.isDefault)).toBe(true);
  });

  it("removes all imports, recurring transactions, and import presets", async () => {
    await seedFullDatabase();

    await storage.reset();

    expect(await storage.imports.findAll()).toHaveLength(0);
    expect(await storage.recurringTransactions.findAll()).toHaveLength(0);
    expect(await storage.importPresets.get("Sparkasse")).toBeNull();
  });

  it("succeeds on an already-empty database and leaves the clean-install state", async () => {
    // Nothing seeded — the database is already at clean-install state.
    await expect(storage.reset()).resolves.toBeUndefined();

    expect(await storage.accounts.findAll()).toHaveLength(0);
    expect(await storage.transactions.findAll()).toHaveLength(0);

    const categories = await storage.categories.findAll();
    expect(categories.map((c) => c.name).sort()).toEqual(
      [...DEFAULT_CATEGORY_NAMES].sort()
    );
  });

  it("leaves the storage usable after reset — new writes succeed", async () => {
    await seedFullDatabase();
    await storage.reset();

    const account = await storage.accounts.create({
      name: "Fresh start",
      kind: "Tagesgeld",
      openingBalance: 0,
      openingDate: "2026-02-01",
    });

    const all = await storage.accounts.findAll();
    expect(all.map((a) => a.id)).toEqual([account.id]);
  });
});

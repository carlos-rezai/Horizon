import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createStorage } from "../index.js";
import type { Storage } from "../Storage.js";
import type { Account } from "../types.js";
import { balanceAt } from "../../lib/balanceAnchor/balanceAnchor.js";

// Storage parity for the Current Balance: the three native SQL statements
// (findAllWithBalance, findByIdWithBalance, getTotalLiquid) must equal the
// Balance Anchor lib's balanceAt(today), so the two definitions cannot drift.

function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const today = isoDate(new Date());

/** The 15th of each of the 12 months before the current one, oldest first. */
function pastTwelveMonths(): string[] {
  const now = new Date();
  const dates: string[] = [];
  for (let i = 12; i >= 1; i--) {
    dates.push(isoDate(new Date(now.getFullYear(), now.getMonth() - i, 15)));
  }
  return dates;
}

let storage: Storage;

beforeEach(async () => {
  storage = await createStorage({ path: ":memory:" });
});

afterEach(async () => {
  await storage.close();
});

async function expectedBalance(account: Account): Promise<number> {
  const txs = await storage.transactions.findByAccount(account.id);
  return balanceAt(account, txs, today);
}

async function expectParity(accounts: Account[]): Promise<void> {
  const all = await storage.accounts.findAllWithBalance();
  const listed = new Map(all.map((a) => [a.id, a.balance]));
  let liquid = 0;

  for (const account of accounts) {
    const expected = await expectedBalance(account);
    const byId = await storage.accounts.findByIdWithBalance(account.id);

    expect({ list: listed.get(account.id), byId: byId?.balance }).toEqual({
      list: expected,
      byId: expected,
    });
    if (account.kind === "Girokonto" || account.kind === "Tagesgeld") {
      liquid += expected;
    }
  }

  expect(await storage.accounts.getTotalLiquid()).toBe(liquid);
}

describe("Current Balance — SQL equals balanceAt(today)", () => {
  it("live-use fixture: a Girokonto anchored today keeps its balance after 12 past months are imported", async () => {
    const giro = await storage.accounts.create({
      kind: "Girokonto",
      name: "Girokonto",
      anchorBalance: 254321,
      anchorDate: today,
    });

    const rows = pastTwelveMonths().flatMap((date, i) => [
      { date, amount: 250000, description: `Gehalt ${i}`, category: "Income" },
      {
        date,
        amount: -180000 - i * 1000,
        description: `Miete ${i}`,
        category: "Housing",
      },
    ]);
    const record = await storage.imports.create({
      accountId: giro.id,
      bank: "Sparkasse",
      filename: "umsaetze.csv",
      sizeBytes: 2048,
      rows,
    });
    expect(record?.rowCount).toBe(24);

    await expectParity([giro]);

    const byId = await storage.accounts.findByIdWithBalance(giro.id);
    expect(byId?.balance).toBe(254321);
    expect(await storage.accounts.getTotalLiquid()).toBe(254321);
  });

  it("an anchor that precedes every transaction adds them all", async () => {
    const giro = await storage.accounts.create({
      kind: "Girokonto",
      name: "Main",
      anchorBalance: 500000,
      anchorDate: "2025-01-01",
    });
    const tg = await storage.accounts.create({
      kind: "Tagesgeld",
      name: "Reserve",
      anchorBalance: 200000,
      anchorDate: "2025-01-01",
    });
    await storage.accounts.create({
      kind: "Mortgage",
      name: "Haus",
      anchorBalance: 20000000,
      anchorDate: "2025-01-01",
    });

    await storage.transactions.create(giro.id, {
      date: "2025-02-15",
      amount: 100000,
      description: "Salary",
      category: "Income",
    });
    await storage.transactions.create(giro.id, {
      date: "2025-03-20",
      amount: -50000,
      description: "Rent",
      category: "Housing",
    });
    await storage.transactions.create(tg.id, {
      date: "2025-04-01",
      amount: 1500,
      description: "Interest",
      category: "Income",
    });

    await expectParity([giro, tg]);

    const byId = await storage.accounts.findByIdWithBalance(giro.id);
    expect(byId?.balance).toBe(550000);
    expect(await storage.accounts.getTotalLiquid()).toBe(550000 + 201500);
  });

  it("a transaction on the Anchor Date is absorbed, not added on top", async () => {
    const giro = await storage.accounts.create({
      kind: "Girokonto",
      name: "Main",
      anchorBalance: 50000,
      anchorDate: "2025-06-15",
    });

    await storage.transactions.create(giro.id, {
      date: "2025-06-10",
      amount: -2000,
      description: "Before the anchor",
      category: "Food",
    });
    await storage.transactions.create(giro.id, {
      date: "2025-06-15",
      amount: -7000,
      description: "On the anchor date",
      category: "Food",
    });
    await storage.transactions.create(giro.id, {
      date: "2025-06-20",
      amount: 1000,
      description: "After the anchor",
      category: "Income",
    });

    await expectParity([giro]);

    const byId = await storage.accounts.findByIdWithBalance(giro.id);
    expect(byId?.balance).toBe(51000);
    expect(await storage.accounts.getTotalLiquid()).toBe(51000);
  });
});

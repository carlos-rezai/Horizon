import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createStorage } from "../../storage/index.js";
import type { Storage } from "../../storage/Storage.js";
import type { Account } from "../../storage/types.js";
import { currentMonth, endOfMonth } from "../../lib/date/date.js";
import {
  findAllWithBalance,
  findByIdWithBalance,
  getTotalLiquid,
} from "./balanceService.js";

// Amounts are integer cents, dates ISO strings. Every account is anchored at
// the end of the month three months back, so a day-1 rule has fired exactly
// three times since the anchor by today: two months back, last month and this
// month.

let storage: Storage;

beforeEach(async () => {
  storage = await createStorage({ path: ":memory:" });
});

afterEach(async () => {
  await storage.close();
});

function monthOffset(n: number): string {
  const [year, month] = currentMonth().split("-").map(Number);
  const index = year * 12 + (month - 1) + n;
  const m = String((index % 12) + 1).padStart(2, "0");
  return `${Math.floor(index / 12)}-${m}`;
}

const ANCHOR_DATE = endOfMonth(monthOffset(-3));

async function makeAccount(
  kind: Account["kind"],
  anchorBalance: number,
  name: string = kind
): Promise<Account> {
  return storage.accounts.create({
    kind,
    name,
    anchorBalance,
    anchorDate: ANCHOR_DATE,
  });
}

async function addSalary(accountId: string, amount = 250000) {
  const created = await storage.recurringTransactions.create({
    accountId,
    amount,
    description: "Gehalt",
    category: "Income",
    frequency: "monthly",
    dayOfMonth: 1,
  });
  if (!created) throw new Error("salary rule not created");
  return created;
}

async function addTransfer(
  accountId: string,
  linkedAccountId: string,
  amount: number
) {
  const created = await storage.recurringTransactions.create({
    accountId,
    amount,
    description: "Sparen",
    category: "Transfer",
    frequency: "monthly",
    dayOfMonth: 1,
    linkedAccountId,
  });
  if (!created) throw new Error("transfer rule not created");
  return created;
}

describe("balance service — Current Balance = Recorded Balance + Recurring History", () => {
  it("findByIdWithBalance adds the recurring legs since the anchor to the Recorded Balance", async () => {
    const giro = await makeAccount("Girokonto", 500000);
    await storage.transactions.create(giro.id, {
      date: `${monthOffset(-2)}-15`,
      amount: -10000,
      description: "Supermarkt",
      category: "Food",
    });
    await addSalary(giro.id);

    const result = await findByIdWithBalance(storage, giro.id);

    // Recorded 490000 + three salaries of 250000.
    expect(result?.id).toBe(giro.id);
    expect(result?.balance).toBe(490000 + 750000);
  });

  it("findAllWithBalance moves both sides of a recurring transfer", async () => {
    const giro = await makeAccount("Girokonto", 500000);
    const tg = await makeAccount("Tagesgeld", 200000);
    await addTransfer(giro.id, tg.id, 30000);

    const all = await findAllWithBalance(storage);
    const byId = new Map(all.map((a) => [a.id, a.balance]));

    expect(byId.get(giro.id)).toBe(500000 - 90000);
    expect(byId.get(tg.id)).toBe(200000 + 90000);
  });

  it("findAllWithBalance keeps the stored account order and fields", async () => {
    const giro = await makeAccount("Girokonto", 500000, "Main");
    const tg = await makeAccount("Tagesgeld", 200000, "Reserve");

    const all = await findAllWithBalance(storage);

    expect(all.map((a) => [a.id, a.name, a.kind])).toEqual([
      [giro.id, "Main", "Girokonto"],
      [tg.id, "Reserve", "Tagesgeld"],
    ]);
  });

  it("an account without rules keeps its Recorded Balance", async () => {
    const giro = await makeAccount("Girokonto", 500000);
    const tg = await makeAccount("Tagesgeld", 200000);
    await addSalary(giro.id);
    await storage.transactions.create(tg.id, {
      date: `${monthOffset(-1)}-10`,
      amount: 1500,
      description: "Zinsen",
      category: "Income",
    });

    const all = await findAllWithBalance(storage);
    const byId = await findByIdWithBalance(storage, tg.id);

    expect(all.find((a) => a.id === tg.id)?.balance).toBe(201500);
    expect(byId?.balance).toBe(201500);
  });

  it("a Mortgage repayment is capped at the remaining Restschuld", async () => {
    const giro = await makeAccount("Girokonto", 500000);
    const haus = await makeAccount("Mortgage", 150000, "Haus");
    await addTransfer(giro.id, haus.id, 100000);

    const all = await findAllWithBalance(storage);
    const byId = new Map(all.map((a) => [a.id, a.balance]));

    expect(byId.get(haus.id)).toBe(0);
    expect(byId.get(giro.id)).toBe(500000 - 150000);
  });

  it("findByIdWithBalance returns null for an unknown account", async () => {
    expect(await findByIdWithBalance(storage, "not-an-id")).toBeNull();
  });
});

describe("balance service — Total Liquid", () => {
  it("sums only the liquid accounts' Current Balances", async () => {
    const giro = await makeAccount("Girokonto", 500000);
    await makeAccount("Tagesgeld", 200000);
    const depot = await makeAccount("Investment", 100000);
    await makeAccount("Mortgage", 4000000, "Haus");
    await makeAccount("CreditCard", 0, "Visa");
    await addSalary(giro.id);
    await addTransfer(giro.id, depot.id, 20000);
    await addSalary(depot.id, 5000);

    // Giro 500000 + 750000 - 60000; Tagesgeld 200000; Investment excluded.
    expect(await getTotalLiquid(storage)).toBe(1190000 + 200000);
  });

  it("is zero with no accounts", async () => {
    expect(await getTotalLiquid(storage)).toBe(0);
  });
});

describe("balance service — rules are read fresh", () => {
  it("editing a rule changes the balance on the next read", async () => {
    const giro = await makeAccount("Girokonto", 500000);
    const salary = await addSalary(giro.id);

    expect((await findByIdWithBalance(storage, giro.id))?.balance).toBe(
      500000 + 750000
    );

    await storage.recurringTransactions.update(salary.id, { amount: 300000 });

    expect((await findByIdWithBalance(storage, giro.id))?.balance).toBe(
      500000 + 900000
    );
  });

  it("deleting a rule returns the account to its Recorded Balance", async () => {
    const giro = await makeAccount("Girokonto", 500000);
    const salary = await addSalary(giro.id);

    await storage.recurringTransactions.delete(salary.id);

    expect((await findByIdWithBalance(storage, giro.id))?.balance).toBe(500000);
    expect(await getTotalLiquid(storage)).toBe(500000);
  });
});

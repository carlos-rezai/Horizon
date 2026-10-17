import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createStorage } from "../../storage/index.js";
import type { Storage } from "../../storage/Storage.js";
import { generateSettlements } from "./settlementService.js";

// Amounts are integer cents, dates ISO strings.

let storage: Storage;

beforeEach(async () => {
  storage = await createStorage({ path: ":memory:" });
});

afterEach(async () => {
  vi.useRealTimers();
  await storage.close();
});

describe("generateSettlements — today", () => {
  it("settles up to the local today, even in the first hour of the 1st", async () => {
    // The card is linked since 30 Sep and settles on the 15th. October's
    // 50 EUR settles on 15 Nov; the 20 EUR charged today, 1 Nov, settles on
    // 15 Dec — but only when today is read in local time, not UTC.
    const giro = await storage.accounts.create({
      kind: "Girokonto",
      name: "Giro",
      anchorBalance: 500000,
      anchorDate: "2026-09-30",
    });
    const card = await storage.accounts.create({
      kind: "CreditCard",
      name: "Card",
      anchorBalance: 0,
      anchorDate: "2026-09-30",
      linkedAccountId: giro.id,
      settlementDay: 15,
    });
    await storage.transactions.create(card.id, {
      date: "2026-10-10",
      amount: -5000,
      description: "Books",
      category: "Shopping",
    });
    await storage.transactions.create(card.id, {
      date: "2026-11-01",
      amount: -2000,
      description: "Coffee",
      category: "Food",
    });

    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 10, 1, 0, 30));
    await generateSettlements(storage);

    const settled = (await storage.transactions.findAll())
      .filter((tx) => tx.accountId === card.id && tx.isAutoSettlement)
      .map((tx) => [tx.date, tx.amount]);
    expect(settled).toEqual([
      ["2026-11-15", 5000],
      ["2026-12-15", 2000],
    ]);
  });
});

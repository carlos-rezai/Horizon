import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import type { Express } from "express";
import {
  calcNetCashflow,
  calcFreeCashflow,
  calcTotalLiquid,
} from "../lib/cashflow.js";
import { createSqliteAppHandle } from "./helpers/sqliteApp.js";

let app: Express;
let reset: () => Promise<void>;
let cleanup: () => Promise<void>;

beforeAll(async () => {
  const handle = await createSqliteAppHandle();
  app = handle.app;
  reset = handle.reset;
  cleanup = handle.cleanup;
});

afterAll(async () => {
  await cleanup();
});

afterEach(async () => {
  await reset();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function createAccount(
  kind: string,
  name: string,
  openingBalance: number
) {
  const res = await request(app).post("/accounts").send({
    kind,
    name,
    openingBalance,
    openingDate: "2026-01-01",
  });
  return res.body as { id: string };
}

async function addTransaction(
  accountId: string,
  amount: number,
  date: string,
  category = "Food"
) {
  await request(app)
    .post(`/accounts/${accountId}/transactions`)
    .send({ date, amount, description: "Test tx", category });
}

// ---------------------------------------------------------------------------
// Pure function: calcNetCashflow
// ---------------------------------------------------------------------------

describe("calcNetCashflow", () => {
  it("returns the sum of all non-transfer transactions", () => {
    const txs = [
      { amount: 323643, accountId: "a1", transferId: undefined },
      { amount: -95442, accountId: "a1", transferId: undefined },
      { amount: -28500, accountId: "a1", transferId: undefined },
    ];
    expect(calcNetCashflow(txs)).toBe(323643 - 95442 - 28500);
  });

  it("excludes transactions that have a transferId", () => {
    const txs = [
      { amount: 323643, accountId: "a1", transferId: undefined },
      { amount: -70000, accountId: "a1", transferId: "transfer-123" },
    ];
    expect(calcNetCashflow(txs)).toBe(323643);
  });

  it("returns 0 for an empty list", () => {
    expect(calcNetCashflow([])).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Pure function: calcFreeCashflow
// ---------------------------------------------------------------------------

describe("calcFreeCashflow", () => {
  it("returns the sum for the specified account only", () => {
    const txs = [
      { amount: 323643, accountId: "account-a", transferId: undefined },
      { amount: -95442, accountId: "account-a", transferId: undefined },
      { amount: 100000, accountId: "account-b", transferId: undefined },
    ];
    expect(calcFreeCashflow(txs, "account-a")).toBe(323643 - 95442);
  });

  it("excludes transfer transactions for the account", () => {
    const txs = [
      { amount: 323643, accountId: "account-a", transferId: undefined },
      { amount: -70000, accountId: "account-a", transferId: "transfer-123" },
    ];
    expect(calcFreeCashflow(txs, "account-a")).toBe(323643);
  });
});

// ---------------------------------------------------------------------------
// Pure function: calcTotalLiquid
// ---------------------------------------------------------------------------

describe("calcTotalLiquid", () => {
  it("sums Girokonto and Tagesgeld balances", () => {
    const accounts = [
      { _id: "a1", kind: "Girokonto" as const, balance: 538000 },
      { _id: "a2", kind: "Tagesgeld" as const, balance: 170300 },
    ];
    expect(calcTotalLiquid(accounts)).toBe(538000 + 170300);
  });

  it("excludes Mortgage, CreditCard, and Investment accounts", () => {
    const accounts = [
      { _id: "a1", kind: "Girokonto" as const, balance: 538000 },
      { _id: "a2", kind: "Mortgage" as const, balance: 4009661 },
      { _id: "a3", kind: "CreditCard" as const, balance: 6425 },
      { _id: "a4", kind: "Investment" as const, balance: 135000 },
    ];
    expect(calcTotalLiquid(accounts)).toBe(538000);
  });

  it("returns 0 when no liquid accounts exist", () => {
    const accounts = [
      { _id: "a1", kind: "Mortgage" as const, balance: 4009661 },
    ];
    expect(calcTotalLiquid(accounts)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// API: GET /accounts/:id/cashflow?month=YYYY-MM
// ---------------------------------------------------------------------------

describe("GET /accounts/:id/cashflow", () => {
  it("returns netCashflow and freeCashflow for the specified month", async () => {
    const account = await createAccount("Girokonto", "Main", 0);

    await addTransaction(account.id, 323643, "2026-03-31");
    await addTransaction(account.id, -95442, "2026-03-02");
    // different month — should not be included
    await addTransaction(account.id, -50000, "2026-04-01");

    const res = await request(app).get(
      `/accounts/${account.id}/cashflow?month=2026-03`
    );

    expect(res.status).toBe(200);
    expect(res.body.netCashflow).toBe(323643 - 95442);
    expect(res.body.freeCashflow).toBe(323643 - 95442);
  });

  it("excludes transfers from netCashflow", async () => {
    const source = await createAccount("Girokonto", "Main", 500000);
    const dest = await createAccount("Tagesgeld", "Savings", 0);

    await addTransaction(source.id, 323643, "2026-03-31");

    await request(app).post("/transfers").send({
      fromAccountId: source.id,
      toAccountId: dest.id,
      amount: 70000,
      date: "2026-03-01",
      description: "Savings transfer",
      category: "Transfer",
    });

    const res = await request(app).get(
      `/accounts/${source.id}/cashflow?month=2026-03`
    );

    expect(res.status).toBe(200);
    expect(res.body.netCashflow).toBe(323643);
  });
});

// ---------------------------------------------------------------------------
// API: GET /accounts/liquid
// ---------------------------------------------------------------------------

describe("GET /accounts/liquid", () => {
  it("returns the sum of all Girokonto and Tagesgeld balances", async () => {
    const girokonto = await createAccount("Girokonto", "Main", 500000);
    await createAccount("Tagesgeld", "Savings", 170300);

    // add a transaction to verify derived balance is used
    await addTransaction(girokonto.id, 323643, "2026-03-01");

    const res = await request(app).get("/accounts/liquid");

    expect(res.status).toBe(200);
    // Girokonto balance = 500000 + 323643, Tagesgeld = 170300
    expect(res.body.totalLiquid).toBe(500000 + 323643 + 170300);
  });

  it("excludes Mortgage and Investment account balances", async () => {
    await createAccount("Girokonto", "Main", 500000);
    await createAccount("Mortgage", "Darlehen", 4009661);
    await createAccount("Investment", "ETF", 135000);

    const res = await request(app).get("/accounts/liquid");

    expect(res.status).toBe(200);
    expect(res.body.totalLiquid).toBe(500000);
  });
});

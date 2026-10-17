import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import request from "supertest";
import type { Express } from "express";
import { createSqliteAppHandle } from "../../testing/sqliteApp.js";

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

async function createAccount(overrides: Record<string, unknown> = {}) {
  const res = await request(app)
    .post("/accounts")
    .send({
      kind: "Girokonto",
      name: "Main",
      anchorBalance: 0,
      anchorDate: "2025-01-01",
      ...overrides,
    });
  return res.body as { id: string };
}

async function addTransaction(
  accountId: string,
  amount: number,
  date: string,
  category: string
) {
  await request(app)
    .post(`/accounts/${accountId}/transactions`)
    .send({ date, amount, description: "Test tx", category });
}

interface YcRow {
  category: string;
  thisYear: number;
  lastYear: number;
}

// ---------------------------------------------------------------------------
// GET /reports/year-comparison?month=YYYY-MM
// ---------------------------------------------------------------------------

describe("GET /reports/year-comparison", () => {
  it("returns 200 with { month, rows } for the viewed month", async () => {
    const giro = await createAccount();
    await addTransaction(giro.id, -1000, "2026-03-01", "Groceries");

    const res = await request(app).get(
      "/reports/year-comparison?month=2026-06"
    );

    expect(res.status).toBe(200);
    expect(res.body.month).toBe("2026-06");
    expect(Array.isArray(res.body.rows)).toBe(true);
  });

  it("aggregates per-category magnitudes pairing this year against last year", async () => {
    const giro = await createAccount();
    // this year (Jan–June 2026)
    await addTransaction(giro.id, -1000, "2026-02-01", "Groceries");
    await addTransaction(giro.id, -2000, "2026-05-01", "Groceries");
    // last year, same Jan–June 2025 window
    await addTransaction(giro.id, -4000, "2025-03-01", "Groceries");

    const res = await request(app).get(
      "/reports/year-comparison?month=2026-06"
    );

    const row = (res.body.rows as YcRow[]).find(
      (r) => r.category === "Groceries"
    );
    expect(row).toEqual({
      category: "Groceries",
      thisYear: 3000,
      lastYear: 4000,
    });
  });

  it("returns rows sorted by thisYear descending", async () => {
    const giro = await createAccount();
    await addTransaction(giro.id, -1000, "2026-03-01", "Small");
    await addTransaction(giro.id, -5000, "2026-03-01", "Big");
    await addTransaction(giro.id, -3000, "2026-03-01", "Mid");

    const res = await request(app).get(
      "/reports/year-comparison?month=2026-06"
    );

    const categories = (res.body.rows as YcRow[]).map((r) => r.category);
    expect(categories).toEqual(["Big", "Mid", "Small"]);
  });

  it("caps the result at five categories", async () => {
    const giro = await createAccount();
    for (let i = 1; i <= 6; i++) {
      await addTransaction(giro.id, -i * 100, "2026-03-01", `C${i}`);
    }

    const res = await request(app).get(
      "/reports/year-comparison?month=2026-06"
    );

    expect((res.body.rows as YcRow[]).length).toBeLessThanOrEqual(5);
  });

  it("ignores Mortgage and Investment accounts (independent of account tabs)", async () => {
    const giro = await createAccount();
    const mort = await createAccount({
      kind: "Mortgage",
      name: "Darlehen",
      anchorBalance: -4000000,
    });
    await addTransaction(giro.id, -1000, "2026-03-01", "Groceries");
    await addTransaction(mort.id, -50000, "2026-03-01", "Groceries");

    const res = await request(app).get(
      "/reports/year-comparison?month=2026-06"
    );

    const row = (res.body.rows as YcRow[]).find(
      (r) => r.category === "Groceries"
    );
    expect(row?.thisYear).toBe(1000);
  });
});

// ---------------------------------------------------------------------------
// ?month validation (issue #146)
// ---------------------------------------------------------------------------

describe("GET /reports/year-comparison — ?month validation", () => {
  it("returns 400 when month is missing", async () => {
    const res = await request(app).get("/reports/year-comparison");
    expect(res.status).toBe(400);
  });

  it("returns 400 when month does not match ^\\d{4}-\\d{2}$", async () => {
    const res = await request(app).get("/reports/year-comparison?month=2026-6");
    expect(res.status).toBe(400);
  });

  it("returns 400 for a non-date month value", async () => {
    const res = await request(app).get("/reports/year-comparison?month=June");
    expect(res.status).toBe(400);
  });

  it("returns 400 for month 13", async () => {
    const res = await request(app).get(
      "/reports/year-comparison?month=2026-13"
    );
    expect(res.status).toBe(400);
  });

  it("answers 400 with issues on a malformed month", async () => {
    const res = await request(app).get("/reports/year-comparison?month=June");
    expect(res.status).toBe(400);
    expect(res.body.issues).toBeDefined();
  });

  it("answers 400 with issues when the month is missing", async () => {
    const res = await request(app).get("/reports/year-comparison");
    expect(res.status).toBe(400);
    expect(res.body.issues).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// GET /reports/month-cash-flow?month=YYYY-MM
// ---------------------------------------------------------------------------

interface FixedFlowBody {
  kind: string;
  recurringId?: string;
  date: string;
  description: string;
  category?: string;
  amount: number;
  counterpartId?: string;
  side?: string;
}

interface MonthCashFlowBody {
  month: string;
  accounts: { accountId: string; flows: FixedFlowBody[] }[];
}

async function addRecurring(
  accountId: string,
  overrides: Record<string, unknown> = {}
) {
  const res = await request(app)
    .post("/recurring-transactions")
    .send({
      accountId,
      amount: 300000,
      description: "Salary",
      category: "Income",
      frequency: "monthly",
      dayOfMonth: 25,
      ...overrides,
    });
  return res.body as { id: string };
}

async function monthCashFlow(month: string) {
  const res = await request(app).get(`/reports/month-cash-flow?month=${month}`);
  return res as typeof res & { body: MonthCashFlowBody };
}

function groupOf(body: MonthCashFlowBody, accountId: string) {
  return body.accounts.find((g) => g.accountId === accountId);
}

describe("GET /reports/month-cash-flow", () => {
  // The route reads "the current month" from the clock; only `Date` is faked
  // so supertest's real socket keeps working.
  beforeAll(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-07-15T12:00:00"));
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  it("answers 400 with issues on a malformed month", async () => {
    for (const month of ["2026-7", "july", ""]) {
      const res = await request(app).get(
        `/reports/month-cash-flow?month=${month}`
      );
      expect(res.status).toBe(400);
      expect(res.body.issues).toBeDefined();
    }
  });

  it("answers 400 with issues when the month is missing", async () => {
    const res = await request(app).get("/reports/month-cash-flow");

    expect(res.status).toBe(400);
    expect(res.body.issues).toBeDefined();
  });

  it("lists a future month's recurring flows per account, running forward", async () => {
    const giro = await createAccount({ anchorDate: "2026-07-01" });
    const savings = await createAccount({
      kind: "Tagesgeld",
      name: "Savings",
      anchorDate: "2026-07-01",
    });
    const salary = await addRecurring(giro.id);
    const plan = await addRecurring(giro.id, {
      amount: 20000,
      description: "Savings plan",
      category: "Transfer",
      dayOfMonth: 3,
      linkedAccountId: savings.id,
    });

    const res = await monthCashFlow("2026-09");

    expect(res.status).toBe(200);
    expect(res.body.month).toBe("2026-09");
    expect(groupOf(res.body, giro.id)?.flows).toEqual([
      expect.objectContaining({
        kind: "recurring",
        recurringId: plan.id,
        date: "2026-09-03",
        description: "Savings plan",
        amount: -20000,
        counterpartId: savings.id,
        side: "source",
      }),
      expect.objectContaining({
        kind: "recurring",
        recurringId: salary.id,
        date: "2026-09-25",
        description: "Salary",
        category: "Income",
        amount: 300000,
      }),
    ]);
    expect(groupOf(res.body, savings.id)?.flows).toEqual([
      expect.objectContaining({
        recurringId: plan.id,
        amount: 20000,
        counterpartId: giro.id,
        side: "destination",
      }),
    ]);
  });

  it("lists the current month's recurring flows", async () => {
    const giro = await createAccount({ anchorDate: "2026-07-01" });
    await addRecurring(giro.id);

    const res = await monthCashFlow("2026-07");

    expect(groupOf(res.body, giro.id)?.flows).toEqual([
      expect.objectContaining({ date: "2026-07-25", amount: 300000 }),
    ]);
  });

  it("derives a past month from History's run, from the History Span's start", async () => {
    // Restschuld €1,500 known on 10 Jan: the €1,000 rate pays it down in
    // February and is capped at the €500 left in March — only a run that
    // starts at the History Span sees that.
    const giro = await createAccount({
      anchorBalance: 500000,
      anchorDate: "2026-01-10",
    });
    const mortgage = await createAccount({
      kind: "Mortgage",
      name: "Mortgage",
      anchorBalance: 150000,
      anchorDate: "2026-01-10",
    });
    const rate = await addRecurring(giro.id, {
      amount: 100000,
      description: "Darlehen",
      category: "Housing",
      dayOfMonth: 1,
      linkedAccountId: mortgage.id,
    });

    const feb = await monthCashFlow("2026-02");
    const mar = await monthCashFlow("2026-03");
    const apr = await monthCashFlow("2026-04");

    expect(feb.status).toBe(200);
    expect(groupOf(feb.body, mortgage.id)?.flows).toEqual([
      expect.objectContaining({ recurringId: rate.id, amount: 100000 }),
    ]);
    expect(groupOf(mar.body, mortgage.id)?.flows).toEqual([
      expect.objectContaining({
        recurringId: rate.id,
        amount: 50000,
        counterpartId: giro.id,
        side: "destination",
      }),
    ]);
    expect(groupOf(apr.body, mortgage.id)?.flows).toEqual([]);
  });

  it("returns empty groups for a month before the History Span", async () => {
    const giro = await createAccount({ anchorDate: "2026-01-10" });
    await addRecurring(giro.id);

    const res = await monthCashFlow("2025-11");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      month: "2025-11",
      accounts: [{ accountId: giro.id, flows: [] }],
    });
  });

  it("returns one group per account of every kind, in sortOrder", async () => {
    const giro = await createAccount({ anchorDate: "2026-07-01" });
    const etf = await createAccount({
      kind: "Investment",
      name: "ETF",
      anchorDate: "2026-07-01",
    });
    const visa = await createAccount({
      kind: "CreditCard",
      name: "Visa",
      anchorDate: "2026-07-01",
    });
    await request(app)
      .patch("/accounts/reorder")
      .send({ orderedIds: [visa.id, giro.id, etf.id] });

    const res = await monthCashFlow("2026-09");

    expect(res.body.accounts.map((g) => g.accountId)).toEqual([
      visa.id,
      giro.id,
      etf.id,
    ]);
  });
});

describe("GET /reports/month-cash-flow — CreditCard settlement rows", () => {
  // The current month is July 2026; only `Date` is faked so supertest's real
  // socket keeps working.
  beforeAll(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-07-15T12:00:00"));
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  // A Girokonto funding a CreditCard that settles on the 15th, both anchored
  // on 1 May.
  async function seedCard() {
    const giro = await createAccount({
      anchorBalance: 500000,
      anchorDate: "2026-05-01",
    });
    const card = await createAccount({
      kind: "CreditCard",
      name: "Visa",
      anchorBalance: 0,
      anchorDate: "2026-05-01",
      linkedAccountId: giro.id,
      settlementDay: 15,
    });
    return { giro, card };
  }

  function settlementsOf(body: MonthCashFlowBody, accountId: string) {
    return (groupOf(body, accountId)?.flows ?? []).filter(
      (f) => f.kind === "settlement"
    );
  }

  it("lists a past month's stored settlement on the card and the funding account, with opposite signs", async () => {
    const { giro, card } = await seedCard();
    await addTransaction(card.id, -10000, "2026-05-20", "Food");
    await request(app).post("/settlements/generate");

    const res = await monthCashFlow("2026-06");

    expect(res.status).toBe(200);
    expect(groupOf(res.body, giro.id)?.flows).toEqual([
      expect.objectContaining({
        kind: "settlement",
        date: "2026-06-15",
        description: "Auto-settlement",
        amount: -10000,
        counterpartId: card.id,
      }),
    ]);
    expect(groupOf(res.body, card.id)?.flows).toEqual([
      expect.objectContaining({
        kind: "settlement",
        date: "2026-06-15",
        description: "Auto-settlement",
        amount: 10000,
        counterpartId: giro.id,
      }),
    ]);
  });

  it("lists the current month's stored settlement on both accounts", async () => {
    const { giro, card } = await seedCard();
    await addTransaction(card.id, -7500, "2026-06-10", "Food");
    await request(app).post("/settlements/generate");

    const res = await monthCashFlow("2026-07");

    expect(settlementsOf(res.body, giro.id)).toEqual([
      expect.objectContaining({ date: "2026-07-15", amount: -7500 }),
    ]);
    expect(settlementsOf(res.body, card.id)).toEqual([
      expect.objectContaining({ date: "2026-07-15", amount: 7500 }),
    ]);
  });

  it("lists a future month's settlement as the engine projects it", async () => {
    const { giro, card } = await seedCard();
    await addTransaction(card.id, -4000, "2026-07-05", "Food");

    const res = await monthCashFlow("2026-08");

    expect(settlementsOf(res.body, giro.id)).toEqual([
      expect.objectContaining({
        kind: "settlement",
        date: "2026-08-15",
        amount: -4000,
        counterpartId: card.id,
      }),
    ]);
    expect(settlementsOf(res.body, card.id)).toEqual([
      expect.objectContaining({
        kind: "settlement",
        date: "2026-08-15",
        amount: 4000,
        counterpartId: giro.id,
      }),
    ]);
  });

  it("moves a future month's projected settlement after a CreditCard expense, on the next request", async () => {
    const { giro, card } = await seedCard();
    await addTransaction(card.id, -4000, "2026-07-05", "Food");
    const before = await monthCashFlow("2026-08");

    await addTransaction(card.id, -1500, "2026-07-09", "Food");
    const after = await monthCashFlow("2026-08");

    expect(settlementsOf(before.body, giro.id)).toEqual([
      expect.objectContaining({ amount: -4000 }),
    ]);
    expect(settlementsOf(after.body, giro.id)).toEqual([
      expect.objectContaining({ amount: -5500 }),
    ]);
    expect(settlementsOf(after.body, card.id)).toEqual([
      expect.objectContaining({ amount: 5500 }),
    ]);
  });
});

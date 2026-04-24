import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";
import { createApp } from "../app.js";
import { projectBalances } from "../lib/projection.js";
import type { Express } from "express";

let mongod: MongoMemoryServer;
let app: Express;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  app = await createApp(mongod.getUri());
});

afterAll(async () => {
  await mongod.stop();
});

afterEach(async () => {
  const { connection } = await import("mongoose");
  const collections = await connection.db?.collections();
  if (collections) {
    for (const collection of collections) {
      await collection.deleteMany({});
    }
  }
});

// ---------------------------------------------------------------------------
// Pure function: shape
// ---------------------------------------------------------------------------

describe("projectBalances - shape", () => {
  it("returns exactly 120 snapshots when months=120 is passed", () => {
    const snapshots = projectBalances([], [], [], "2026-04", "2026-04", 120);
    expect(snapshots).toHaveLength(120);
  });

  it("returns exactly 240 snapshots when months=240 is passed", () => {
    const snapshots = projectBalances([], [], [], "2026-04", "2026-04", 240);
    expect(snapshots).toHaveLength(240);
  });

  it("returns 240 snapshots by default when no months arg is provided", () => {
    const snapshots = projectBalances([], [], [], "2026-04", "2026-04");
    expect(snapshots).toHaveLength(240);
  });

  it("each snapshot has month, accounts map, netCashflow, and totalLiquid", () => {
    const accounts = [
      { _id: "a1", kind: "Girokonto" as const, openingBalance: 100000 },
    ];
    const snapshots = projectBalances(accounts, [], [], "2026-04", "2026-04");

    expect(snapshots[0].month).toBe("2026-04");
    expect(snapshots[1].month).toBe("2026-05");
    expect(snapshots[119].month).toBe("2036-03");
    expect(snapshots[0].accounts["a1"]).toBeDefined();
    expect(snapshots[0].accounts["a1"].projected).toBeDefined();
    expect(typeof snapshots[0].netCashflow).toBe("number");
    expect(typeof snapshots[0].totalLiquid).toBe("number");
  });
});

// ---------------------------------------------------------------------------
// Pure function: monthly recurrence
// ---------------------------------------------------------------------------

describe("projectBalances - monthly recurrence", () => {
  it("a monthly recurring transaction reduces the account balance every month", () => {
    const accounts = [
      { _id: "a1", kind: "Girokonto" as const, openingBalance: 100000 },
    ];
    const recurring = [
      {
        accountId: "a1",
        amount: -50000,
        frequency: "monthly" as const,
        dayOfMonth: 1,
        isActive: true,
      },
    ];
    const snapshots = projectBalances(
      accounts,
      [],
      recurring,
      "2026-04",
      "2026-04"
    );

    // Month 0: 100000 - 50000 = 50000
    expect(snapshots[0].accounts["a1"].projected).toBe(50000);
    // Month 1: 50000 - 50000 = 0
    expect(snapshots[1].accounts["a1"].projected).toBe(0);
    // Month 2: 0 - 50000 = -50000
    expect(snapshots[2].accounts["a1"].projected).toBe(-50000);
  });

  it("netCashflow for each month reflects the monthly recurring amount", () => {
    const accounts = [
      { _id: "a1", kind: "Girokonto" as const, openingBalance: 100000 },
    ];
    const recurring = [
      {
        accountId: "a1",
        amount: -50000,
        frequency: "monthly" as const,
        dayOfMonth: 1,
        isActive: true,
      },
    ];
    const snapshots = projectBalances(
      accounts,
      [],
      recurring,
      "2026-04",
      "2026-04"
    );

    expect(snapshots[0].netCashflow).toBe(-50000);
    expect(snapshots[5].netCashflow).toBe(-50000);
  });

  it("totalLiquid reflects only Girokonto and Tagesgeld projected balances", () => {
    const accounts = [
      { _id: "giro", kind: "Girokonto" as const, openingBalance: 100000 },
      { _id: "mortgage", kind: "Mortgage" as const, openingBalance: 5000000 },
    ];
    const recurring = [
      {
        accountId: "giro",
        amount: -10000,
        frequency: "monthly" as const,
        dayOfMonth: 1,
        isActive: true,
      },
    ];
    const snapshots = projectBalances(
      accounts,
      [],
      recurring,
      "2026-04",
      "2026-04"
    );

    // totalLiquid = Girokonto only (Mortgage excluded)
    expect(snapshots[0].totalLiquid).toBe(90000);
    expect(snapshots[1].totalLiquid).toBe(80000);
  });
});

// ---------------------------------------------------------------------------
// Pure function: quarterly recurrence
// ---------------------------------------------------------------------------

describe("projectBalances - quarterly recurrence", () => {
  it("fires in months 0, 3, 6, 9 and not in between", () => {
    const accounts = [
      { _id: "a1", kind: "Girokonto" as const, openingBalance: 200000 },
    ];
    const recurring = [
      {
        accountId: "a1",
        amount: -30000,
        frequency: "quarterly" as const,
        dayOfMonth: 1,
        isActive: true,
      },
    ];
    const snapshots = projectBalances(
      accounts,
      [],
      recurring,
      "2026-04",
      "2026-04"
    );

    // Month 0: fires → 200000 - 30000 = 170000
    expect(snapshots[0].accounts["a1"].projected).toBe(170000);
    // Month 1: no fire → stays 170000
    expect(snapshots[1].accounts["a1"].projected).toBe(170000);
    // Month 2: no fire → stays 170000
    expect(snapshots[2].accounts["a1"].projected).toBe(170000);
    // Month 3: fires → 170000 - 30000 = 140000
    expect(snapshots[3].accounts["a1"].projected).toBe(140000);
    // Month 4: no fire → stays 140000
    expect(snapshots[4].accounts["a1"].projected).toBe(140000);
    // Month 6: fires → 140000 - 30000 = 110000
    expect(snapshots[6].accounts["a1"].projected).toBe(110000);
  });
});

// ---------------------------------------------------------------------------
// Pure function: annual recurrence
// ---------------------------------------------------------------------------

describe("projectBalances - annual recurrence", () => {
  it("fires in months 0, 12, 24 and not in between", () => {
    const accounts = [
      { _id: "a1", kind: "Tagesgeld" as const, openingBalance: 500000 },
    ];
    const recurring = [
      {
        accountId: "a1",
        amount: -70000,
        frequency: "annual" as const,
        dayOfMonth: 1,
        isActive: true,
      },
    ];
    const snapshots = projectBalances(
      accounts,
      [],
      recurring,
      "2026-04",
      "2026-04"
    );

    // Month 0: fires → 500000 - 70000 = 430000
    expect(snapshots[0].accounts["a1"].projected).toBe(430000);
    // Month 1-11: no change
    expect(snapshots[1].accounts["a1"].projected).toBe(430000);
    expect(snapshots[11].accounts["a1"].projected).toBe(430000);
    // Month 12: fires → 430000 - 70000 = 360000
    expect(snapshots[12].accounts["a1"].projected).toBe(360000);
    // Month 13-23: no change
    expect(snapshots[13].accounts["a1"].projected).toBe(360000);
    // Month 24: fires → 360000 - 70000 = 290000
    expect(snapshots[24].accounts["a1"].projected).toBe(290000);
  });
});

// ---------------------------------------------------------------------------
// Pure function: Sondertilgung + Darlehen
// ---------------------------------------------------------------------------

describe("projectBalances - Sondertilgung", () => {
  it("annual ST (linkedAccountId → Mortgage) reduces Mortgage balance when it fires", () => {
    const accounts = [
      { _id: "tagesgeld", kind: "Tagesgeld" as const, openingBalance: 1000000 },
      { _id: "mortgage", kind: "Mortgage" as const, openingBalance: 30000000 },
    ];
    const recurring = [
      {
        accountId: "tagesgeld",
        amount: 700000,
        frequency: "annual" as const,
        dayOfMonth: 1,
        isActive: true,
        linkedAccountId: "mortgage",
      },
    ];
    const snapshots = projectBalances(
      accounts,
      [],
      recurring,
      "2026-04",
      "2026-04"
    );

    // Month 0: ST fires
    // Tagesgeld: 1000000 - 700000 = 300000
    expect(snapshots[0].accounts["tagesgeld"].projected).toBe(300000);
    // Mortgage: 30000000 - 700000 = 29300000 (debt reduced)
    expect(snapshots[0].accounts["mortgage"].projected).toBe(29300000);

    // Month 11: no change to Mortgage
    expect(snapshots[11].accounts["mortgage"].projected).toBe(29300000);

    // Month 12: ST fires again → Mortgage: 29300000 - 700000 = 28600000
    expect(snapshots[12].accounts["mortgage"].projected).toBe(28600000);
  });

  it("a transfer to a Mortgage is excluded from netCashflow", () => {
    const accounts = [
      { _id: "tagesgeld", kind: "Tagesgeld" as const, openingBalance: 1000000 },
      { _id: "mortgage", kind: "Mortgage" as const, openingBalance: 30000000 },
    ];
    const recurring = [
      {
        accountId: "tagesgeld",
        amount: 700000,
        frequency: "annual" as const,
        dayOfMonth: 1,
        isActive: true,
        linkedAccountId: "mortgage",
      },
    ];
    const snapshots = projectBalances(
      accounts,
      [],
      recurring,
      "2026-04",
      "2026-04"
    );

    // ST is a transfer — excluded from netCashflow
    expect(snapshots[0].netCashflow).toBe(0);
  });

  it("a regular Darlehen (monthly, from Girokonto) does NOT affect Mortgage balance", () => {
    const accounts = [
      { _id: "giro", kind: "Girokonto" as const, openingBalance: 500000 },
      { _id: "mortgage", kind: "Mortgage" as const, openingBalance: 30000000 },
    ];
    const recurring = [
      {
        accountId: "giro",
        amount: -95000,
        frequency: "monthly" as const,
        dayOfMonth: 1,
        isActive: true,
        // no linkedAccountId — regular outflow, not a transfer
      },
    ];
    const snapshots = projectBalances(
      accounts,
      [],
      recurring,
      "2026-04",
      "2026-04"
    );

    // Girokonto decreases
    expect(snapshots[0].accounts["giro"].projected).toBe(405000);
    // Mortgage is unchanged in all 120 months
    expect(snapshots[0].accounts["mortgage"].projected).toBe(30000000);
    expect(snapshots[11].accounts["mortgage"].projected).toBe(30000000);
    expect(snapshots[119].accounts["mortgage"].projected).toBe(30000000);
  });

  it("clamps Mortgage to zero when ST amount exceeds remaining balance", () => {
    const accounts = [
      { _id: "tagesgeld", kind: "Tagesgeld" as const, openingBalance: 1000000 },
      // Mortgage balance smaller than the annual ST amount
      { _id: "mortgage", kind: "Mortgage" as const, openingBalance: 300000 },
    ];
    const recurring = [
      {
        accountId: "tagesgeld",
        amount: 700000,
        frequency: "annual" as const,
        dayOfMonth: 1,
        isActive: true,
        linkedAccountId: "mortgage",
      },
    ];
    const snapshots = projectBalances(
      accounts,
      [],
      recurring,
      "2026-04",
      "2026-04",
      24
    );

    // Month 0: ST fires — only 300000 remains, so debit is clamped to 300000
    expect(snapshots[0].accounts["mortgage"].projected).toBe(0);
    // Tagesgeld debited by actual 300000, not full 700000
    expect(snapshots[0].accounts["tagesgeld"].projected).toBe(700000);
    // Month 12: Mortgage already at 0 — ST skipped, Tagesgeld unchanged
    expect(snapshots[12].accounts["mortgage"].projected).toBe(0);
    expect(snapshots[12].accounts["tagesgeld"].projected).toBe(700000);
  });

  it("Restschuld never goes below zero across all projected months", () => {
    const accounts = [
      { _id: "tagesgeld", kind: "Tagesgeld" as const, openingBalance: 5000000 },
      { _id: "mortgage", kind: "Mortgage" as const, openingBalance: 1000000 },
    ];
    const recurring = [
      {
        accountId: "tagesgeld",
        amount: 700000,
        frequency: "annual" as const,
        dayOfMonth: 1,
        isActive: true,
        linkedAccountId: "mortgage",
      },
    ];
    const snapshots = projectBalances(
      accounts,
      [],
      recurring,
      "2026-04",
      "2026-04",
      240
    );

    snapshots.forEach((s) => {
      expect(s.accounts["mortgage"].projected).toBeGreaterThanOrEqual(0);
    });
  });
});

// ---------------------------------------------------------------------------
// Pure function: deactivated recurring transactions
// ---------------------------------------------------------------------------

describe("projectBalances - deactivated recurring", () => {
  it("excludes deactivated recurring transactions from all snapshots", () => {
    const accounts = [
      { _id: "a1", kind: "Girokonto" as const, openingBalance: 100000 },
    ];
    const recurring = [
      {
        accountId: "a1",
        amount: -50000,
        frequency: "monthly" as const,
        dayOfMonth: 1,
        isActive: false, // deactivated
      },
    ];
    const snapshots = projectBalances(
      accounts,
      [],
      recurring,
      "2026-04",
      "2026-04"
    );

    // Balance must never change across all 120 months
    snapshots.forEach((s) => {
      expect(s.accounts["a1"].projected).toBe(100000);
    });
  });
});

// ---------------------------------------------------------------------------
// Pure function: plan vs actual
// ---------------------------------------------------------------------------

describe("projectBalances - plan vs actual", () => {
  it("past month snapshots include actual balance derived from transactions", () => {
    const accounts = [
      { _id: "a1", kind: "Girokonto" as const, openingBalance: 100000 },
    ];
    const transactions = [
      { accountId: "a1", date: "2026-01-15", amount: 50000 },
      { accountId: "a1", date: "2026-02-10", amount: -20000 },
    ];
    // fromDate = 2026-01, currentDate = 2026-02 → Jan and Feb are past
    const snapshots = projectBalances(
      accounts,
      transactions,
      [],
      "2026-01",
      "2026-02"
    );

    // Jan actual = openingBalance + Jan tx = 100000 + 50000 = 150000
    expect(snapshots[0].accounts["a1"].actual).toBe(150000);
    // Feb actual = openingBalance + Jan tx + Feb tx = 100000 + 50000 - 20000 = 130000
    expect(snapshots[1].accounts["a1"].actual).toBe(130000);
  });

  it("future month snapshots do not include actual balance", () => {
    const accounts = [
      { _id: "a1", kind: "Girokonto" as const, openingBalance: 100000 },
    ];
    // fromDate = 2026-04, currentDate = 2026-04 → month 1+ (2026-05 onwards) are future
    const snapshots = projectBalances(accounts, [], [], "2026-04", "2026-04");

    // Month 0 is current (2026-04 <= 2026-04) — has actual
    expect(snapshots[0].accounts["a1"].actual).toBeDefined();
    // Month 1 (2026-05) is future — no actual
    expect(snapshots[1].accounts["a1"].actual).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// API: GET /projection
// ---------------------------------------------------------------------------

describe("GET /projection", () => {
  it("returns correct shape", async () => {
    await request(app).post("/accounts").send({
      kind: "Girokonto",
      name: "Main",
      openingBalance: 500000,
      openingDate: "2026-01-01",
    });

    const res = await request(app).get("/projection");

    expect(res.status).toBe(200);
    expect(res.body[0]).toHaveProperty("month");
    expect(res.body[0]).toHaveProperty("accounts");
    expect(res.body[0]).toHaveProperty("netCashflow");
    expect(res.body[0]).toHaveProperty("totalLiquid");
  });

  it("returns 240 snapshots by default when no ?months param is provided", async () => {
    const res = await request(app).get("/projection");

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(240);
  });

  it("returns 240 snapshots when ?months=240 is passed", async () => {
    const res = await request(app).get("/projection?months=240");

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(240);
  });

  it("reflects an active recurring transaction in the projection", async () => {
    const accountRes = await request(app).post("/accounts").send({
      kind: "Girokonto",
      name: "Main",
      openingBalance: 500000,
      openingDate: "2026-01-01",
    });
    const accountId = accountRes.body._id;

    await request(app).post("/recurring-transactions").send({
      accountId,
      amount: -50000,
      description: "Rent",
      category: "Housing",
      frequency: "monthly",
      dayOfMonth: 1,
    });

    const res = await request(app).get("/projection");

    // Month 0: 500000 - 50000 = 450000
    expect(res.body[0].accounts[accountId].projected).toBe(450000);
    // Month 1: 450000 - 50000 = 400000
    expect(res.body[1].accounts[accountId].projected).toBe(400000);
  });
});

// ---------------------------------------------------------------------------
// Pure function: annual recurrence with monthOfYear
// ---------------------------------------------------------------------------

describe("projectBalances - annual recurrence with monthOfYear", () => {
  it("annual with monthOfYear: 10 from April does not fire in April (index 0) and fires in October (index 6)", () => {
    const accounts = [
      { _id: "a1", kind: "Tagesgeld" as const, openingBalance: 500000 },
    ];
    const recurring = [
      {
        accountId: "a1",
        amount: -70000,
        frequency: "annual" as const,
        dayOfMonth: 1,
        isActive: true,
        monthOfYear: 10,
      },
    ];
    const snapshots = projectBalances(
      accounts,
      [],
      recurring,
      "2026-04",
      "2026-04"
    );

    // April (index 0): monthOfYear is 10 — must not fire
    expect(snapshots[0].accounts["a1"].projected).toBe(500000);
    // September (index 5): still no fire
    expect(snapshots[5].accounts["a1"].projected).toBe(500000);
    // October (index 6): first fire → 500000 - 70000 = 430000
    expect(snapshots[6].accounts["a1"].projected).toBe(430000);
    // November (index 7): no change
    expect(snapshots[7].accounts["a1"].projected).toBe(430000);
  });

  it("annual with monthOfYear: 10 fires at October the following year (index 18), not April (index 12)", () => {
    const accounts = [
      { _id: "a1", kind: "Tagesgeld" as const, openingBalance: 500000 },
    ];
    const recurring = [
      {
        accountId: "a1",
        amount: -70000,
        frequency: "annual" as const,
        dayOfMonth: 1,
        isActive: true,
        monthOfYear: 10,
      },
    ];
    const snapshots = projectBalances(
      accounts,
      [],
      recurring,
      "2026-04",
      "2026-04"
    );

    // April 2027 (index 12): must not fire — not October
    expect(snapshots[12].accounts["a1"].projected).toBe(430000);
    // October 2027 (index 18): second fire → 430000 - 70000 = 360000
    expect(snapshots[18].accounts["a1"].projected).toBe(360000);
    // November 2027 (index 19): no change
    expect(snapshots[19].accounts["a1"].projected).toBe(360000);
  });
});

// ---------------------------------------------------------------------------
// Pure function: quarterly recurrence with monthOfYear
// ---------------------------------------------------------------------------

describe("projectBalances - quarterly recurrence with monthOfYear", () => {
  it("quarterly with monthOfYear: 1 from April fires at July (index 3), October (index 6), January (index 9) — not April (index 0)", () => {
    const accounts = [
      { _id: "a1", kind: "Girokonto" as const, openingBalance: 200000 },
    ];
    const recurring = [
      {
        accountId: "a1",
        amount: -30000,
        frequency: "quarterly" as const,
        dayOfMonth: 1,
        isActive: true,
        monthOfYear: 1,
      },
    ];
    const snapshots = projectBalances(
      accounts,
      [],
      recurring,
      "2026-04",
      "2026-04"
    );

    // April (index 0): monthOfYear is 1 (January) — must not fire at start
    expect(snapshots[0].accounts["a1"].projected).toBe(200000);
    // May, June (indices 1–2): no fire
    expect(snapshots[1].accounts["a1"].projected).toBe(200000);
    expect(snapshots[2].accounts["a1"].projected).toBe(200000);
    // July (index 3): first fire → 200000 - 30000 = 170000
    expect(snapshots[3].accounts["a1"].projected).toBe(170000);
    // October (index 6): second fire → 170000 - 30000 = 140000
    expect(snapshots[6].accounts["a1"].projected).toBe(140000);
    // January (index 9): third fire → 140000 - 30000 = 110000
    expect(snapshots[9].accounts["a1"].projected).toBe(110000);
  });
});

// ---------------------------------------------------------------------------
// Pure function: ST with monthOfYear — no premature Tagesgeld drain
// ---------------------------------------------------------------------------

describe("projectBalances - ST with monthOfYear", () => {
  it("monthly Tagesgeld income combined with annual ST (monthOfYear: 10) does not produce a negative Tagesgeld balance in May", () => {
    const accounts = [
      { _id: "tagesgeld", kind: "Tagesgeld" as const, openingBalance: 100000 },
      { _id: "mortgage", kind: "Mortgage" as const, openingBalance: 10000000 },
    ];
    const recurring = [
      {
        accountId: "tagesgeld",
        amount: 200000,
        frequency: "monthly" as const,
        dayOfMonth: 1,
        isActive: true,
      },
      {
        accountId: "tagesgeld",
        amount: 500000,
        frequency: "annual" as const,
        dayOfMonth: 1,
        isActive: true,
        linkedAccountId: "mortgage",
        monthOfYear: 10,
      },
    ];
    const snapshots = projectBalances(
      accounts,
      [],
      recurring,
      "2026-04",
      "2026-04"
    );

    // April (index 0): only monthly income fires — 100000 + 200000 = 300000
    expect(snapshots[0].accounts["tagesgeld"].projected).toBe(300000);
    // May (index 1): only monthly income fires — 300000 + 200000 = 500000
    // Without monthOfYear the ST would have fired in April, leaving Tagesgeld at -200000
    expect(snapshots[1].accounts["tagesgeld"].projected).toBe(500000);
    expect(snapshots[1].accounts["tagesgeld"].projected).toBeGreaterThanOrEqual(0);
  });
});

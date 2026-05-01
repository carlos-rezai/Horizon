import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { projectBalances } from "../lib/projection.js";
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
      { id: "a1", kind: "Girokonto" as const, openingBalance: 100000 },
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
      { id: "a1", kind: "Girokonto" as const, openingBalance: 100000 },
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
      { id: "a1", kind: "Girokonto" as const, openingBalance: 100000 },
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
      { id: "giro", kind: "Girokonto" as const, openingBalance: 100000 },
      { id: "mortgage", kind: "Mortgage" as const, openingBalance: 5000000 },
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
      { id: "a1", kind: "Girokonto" as const, openingBalance: 200000 },
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
      { id: "a1", kind: "Tagesgeld" as const, openingBalance: 500000 },
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
      { id: "tagesgeld", kind: "Tagesgeld" as const, openingBalance: 1000000 },
      { id: "mortgage", kind: "Mortgage" as const, openingBalance: 30000000 },
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
      { id: "tagesgeld", kind: "Tagesgeld" as const, openingBalance: 1000000 },
      { id: "mortgage", kind: "Mortgage" as const, openingBalance: 30000000 },
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
      { id: "giro", kind: "Girokonto" as const, openingBalance: 500000 },
      { id: "mortgage", kind: "Mortgage" as const, openingBalance: 30000000 },
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
      { id: "tagesgeld", kind: "Tagesgeld" as const, openingBalance: 1000000 },
      // Mortgage balance smaller than the annual ST amount
      { id: "mortgage", kind: "Mortgage" as const, openingBalance: 300000 },
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
      { id: "tagesgeld", kind: "Tagesgeld" as const, openingBalance: 5000000 },
      { id: "mortgage", kind: "Mortgage" as const, openingBalance: 1000000 },
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
      { id: "a1", kind: "Girokonto" as const, openingBalance: 100000 },
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
      { id: "a1", kind: "Girokonto" as const, openingBalance: 100000 },
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
      { id: "a1", kind: "Girokonto" as const, openingBalance: 100000 },
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
    // Opening date set to the current month so the replay covers 0 months —
    // the test asserts only that the recurring is applied in the forward projection.
    const now = new Date();
    const openingDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

    const accountRes = await request(app).post("/accounts").send({
      kind: "Girokonto",
      name: "Main",
      openingBalance: 500000,
      openingDate,
    });
    const accountId = accountRes.body.id;

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
      { id: "a1", kind: "Tagesgeld" as const, openingBalance: 500000 },
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
      { id: "a1", kind: "Tagesgeld" as const, openingBalance: 500000 },
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
      { id: "a1", kind: "Girokonto" as const, openingBalance: 200000 },
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
// Pure function: replay loop — recurring history from openingDate
// ---------------------------------------------------------------------------

describe("projectBalances - replay loop", () => {
  it("account opened 3 months ago with a monthly recurring starts the forward projection at Opening Balance + 3 months applied", () => {
    const accounts = [
      {
        id: "a1",
        kind: "Girokonto" as const,
        openingBalance: 1000000,
        openingDate: "2026-01-01",
      },
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
    // fromDate April 2026 — replay covers Jan, Feb, Mar (3 months)
    const snapshots = projectBalances(
      accounts,
      [],
      recurring,
      "2026-04",
      "2026-04"
    );

    // Starting balance after replay: 1000000 − 3×50000 = 850000
    // Forward index 0 (April): 850000 − 50000 = 800000
    expect(snapshots[0].accounts["a1"].projected).toBe(800000);
    // Forward index 1 (May): 800000 − 50000 = 750000
    expect(snapshots[1].accounts["a1"].projected).toBe(750000);
  });

  it("account opened 13 months ago with annual ST (monthOfYear: 10) has the ST applied once when October is within the replay window", () => {
    const accounts = [
      {
        id: "tagesgeld",
        kind: "Tagesgeld" as const,
        openingBalance: 1000000,
        openingDate: "2025-03-01",
      },
      {
        id: "mortgage",
        kind: "Mortgage" as const,
        openingBalance: 5000000,
        openingDate: "2025-03-01",
      },
    ];
    const recurring = [
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
    // fromDate April 2026 — replay covers Mar 2025 → Mar 2026 (13 months)
    // October 2025 falls in the window → ST fires once
    const snapshots = projectBalances(
      accounts,
      [],
      recurring,
      "2026-04",
      "2026-04"
    );

    // After replay: Tagesgeld 1000000 − 500000 = 500000
    // Forward index 0 (April): no ST fires (monthOfYear: 10) → stays 500000
    expect(snapshots[0].accounts["tagesgeld"].projected).toBe(500000);
    // Mortgage reduced by one ST: 5000000 − 500000 = 4500000
    expect(snapshots[0].accounts["mortgage"].projected).toBe(4500000);
  });

  it("two accounts with different Opening Dates each initialise from their own start date independently", () => {
    const accounts = [
      {
        id: "giro",
        kind: "Girokonto" as const,
        openingBalance: 500000,
        openingDate: "2026-01-01",
      },
      {
        id: "savings",
        kind: "Tagesgeld" as const,
        openingBalance: 1000000,
        openingDate: "2026-03-01",
      },
    ];
    const recurring = [
      {
        accountId: "giro",
        amount: -100000,
        frequency: "monthly" as const,
        dayOfMonth: 1,
        isActive: true,
      },
      {
        accountId: "savings",
        amount: 200000,
        frequency: "monthly" as const,
        dayOfMonth: 1,
        isActive: true,
      },
    ];
    // fromDate April 2026
    // giro replay: Jan, Feb, Mar (3 months) → 500000 − 300000 = 200000
    // savings replay: Mar only (1 month) → 1000000 + 200000 = 1200000
    const snapshots = projectBalances(
      accounts,
      [],
      recurring,
      "2026-04",
      "2026-04"
    );

    // Forward index 0 (April):
    // giro: 200000 − 100000 = 100000
    expect(snapshots[0].accounts["giro"].projected).toBe(100000);
    // savings: 1200000 + 200000 = 1400000
    expect(snapshots[0].accounts["savings"].projected).toBe(1400000);
  });

  it("Variable Spending actual transactions before the current month are included alongside replayed recurring history", () => {
    const accounts = [
      {
        id: "a1",
        kind: "Girokonto" as const,
        openingBalance: 100000,
        openingDate: "2026-01-01",
      },
    ];
    const transactions = [
      { accountId: "a1", date: "2026-01-15", amount: -50000 },
      { accountId: "a1", date: "2026-02-10", amount: -30000 },
    ];
    const recurring = [
      {
        accountId: "a1",
        amount: 300000,
        frequency: "monthly" as const,
        dayOfMonth: 1,
        isActive: true,
      },
    ];
    // fromDate April 2026 — replay covers Jan, Feb, Mar (3 months of +300000)
    // Variable Spending: −50000 (Jan) + −30000 (Feb) = −80000
    // Starting: 100000 + 900000 − 80000 = 920000
    // Forward index 0 (April): 920000 + 300000 = 1220000
    const snapshots = projectBalances(
      accounts,
      transactions,
      recurring,
      "2026-04",
      "2026-04"
    );

    expect(snapshots[0].accounts["a1"].projected).toBe(1220000);
  });

  it("account opened in April 2025 with annual ST (monthOfYear: 10) fires ST in October during 13-month replay, not in April", () => {
    const accounts = [
      {
        id: "tagesgeld",
        kind: "Tagesgeld" as const,
        openingBalance: 1000000,
        openingDate: "2025-04-01",
      },
      {
        id: "mortgage",
        kind: "Mortgage" as const,
        openingBalance: 5000000,
        openingDate: "2025-04-01",
      },
    ];
    const recurring = [
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
    // fromDate May 2026 — replay covers Apr 2025 → Apr 2026 (13 months)
    // Correct: ST fires once in Oct 2025 (calendar month 10 = monthOfYear)
    //   → Tagesgeld 1000000 − 500000 = 500000 starting balance
    // Wrong (legacy): would fire at Apr 2025 (offset 0) AND Apr 2026 (offset 12)
    //   → Tagesgeld 1000000 − 1000000 = 0 starting balance
    const snapshots = projectBalances(
      accounts,
      [],
      recurring,
      "2026-05",
      "2026-05"
    );

    // Forward index 0 (May 2026): no ST fires yet (monthOfYear: 10 → October)
    expect(snapshots[0].accounts["tagesgeld"].projected).toBe(500000);
    // Mortgage reduced once: 5000000 − 500000 = 4500000
    expect(snapshots[0].accounts["mortgage"].projected).toBe(4500000);
  });
});

// ---------------------------------------------------------------------------
// Pure function: ST with monthOfYear — no premature Tagesgeld drain
// ---------------------------------------------------------------------------

describe("projectBalances - ST with monthOfYear", () => {
  it("monthly Tagesgeld income combined with annual ST (monthOfYear: 10) does not produce a negative Tagesgeld balance in May", () => {
    const accounts = [
      { id: "tagesgeld", kind: "Tagesgeld" as const, openingBalance: 100000 },
      { id: "mortgage", kind: "Mortgage" as const, openingBalance: 10000000 },
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
    expect(snapshots[1].accounts["tagesgeld"].projected).toBeGreaterThanOrEqual(
      0
    );
  });
});

// ---------------------------------------------------------------------------
// Pure function: correctness verification suite
// ---------------------------------------------------------------------------
//
// Realistic multi-account configuration, manually verified:
//   - giro  (Girokonto):  openingBalance 300000
//   - savings (Tagesgeld): openingBalance 500000
//   - mortgage (Mortgage): openingBalance 2000000
//
// Recurring transactions:
//   1. Salary       giro  +350000  monthly
//   2. Expenses     giro  -200000  monthly
//   3. Transfer     giro  +100000  monthly  → savings
//   4. Quarterly    giro   -30000  quarterly (no monthOfYear)
//   5. ST         savings +500000  annual   → mortgage  monthOfYear: 10
//
// fromDate "2026-04", no openingDate → no replay.
// Net giro per non-quarterly month: +350000 −200000 −100000 = +50000
// Net giro per quarterly month:     +50000 −30000  = +20000
// Net savings per month (excl. ST): +100000
//
// Key index → calendar-month mapping (fromDate "2026-04"):
//   0 = Apr 2026, 1 = May, 3 = Jul, 5 = Sep, 6 = Oct, 7 = Nov
//   8 = Dec, 9 = Jan 2027, 12 = Apr 2027, 18 = Oct 2027
//   20 = Dec 2027, 30 = Oct 2028, 42 = Oct 2029

describe("projectBalances - correctness verification suite", () => {
  const accounts = [
    { id: "giro", kind: "Girokonto" as const, openingBalance: 300000 },
    { id: "savings", kind: "Tagesgeld" as const, openingBalance: 500000 },
    { id: "mortgage", kind: "Mortgage" as const, openingBalance: 2000000 },
  ];
  const recurring = [
    {
      accountId: "giro",
      amount: 350000,
      frequency: "monthly" as const,
      dayOfMonth: 1,
      isActive: true,
    },
    {
      accountId: "giro",
      amount: -200000,
      frequency: "monthly" as const,
      dayOfMonth: 1,
      isActive: true,
    },
    {
      accountId: "giro",
      amount: 100000,
      frequency: "monthly" as const,
      dayOfMonth: 1,
      isActive: true,
      linkedAccountId: "savings",
    },
    {
      accountId: "giro",
      amount: -30000,
      frequency: "quarterly" as const,
      dayOfMonth: 1,
      isActive: true,
    },
    {
      accountId: "savings",
      amount: 500000,
      frequency: "annual" as const,
      dayOfMonth: 1,
      isActive: true,
      linkedAccountId: "mortgage",
      monthOfYear: 10,
    },
  ];

  it("Girokonto balance is correct after monthly net income and quarterly deductions", () => {
    const snapshots = projectBalances(
      accounts,
      [],
      recurring,
      "2026-04",
      "2026-04",
      60
    );

    // i=0 Apr: quarterly fires → 300000 +350000 −200000 −100000 −30000 = 320000
    expect(snapshots[0].accounts["giro"].projected).toBe(320000);
    // i=1 May: no quarterly → 320000 +50000 = 370000
    expect(snapshots[1].accounts["giro"].projected).toBe(370000);
    // i=3 Jul: quarterly fires → 420000 +350000 −200000 −100000 −30000 = 440000
    expect(snapshots[3].accounts["giro"].projected).toBe(440000);
    // i=6 Oct: quarterly fires, ST (savings→mortgage) does not affect giro
    //   540000 +350000 −200000 −100000 −30000 = 560000
    expect(snapshots[6].accounts["giro"].projected).toBe(560000);
    // i=12 Apr 2027: quarterly fires → 800000
    expect(snapshots[12].accounts["giro"].projected).toBe(800000);
  });

  it("Tagesgeld balance tracks monthly transfer income and dips by ST each October", () => {
    const snapshots = projectBalances(
      accounts,
      [],
      recurring,
      "2026-04",
      "2026-04",
      60
    );

    // i=0 Apr: +100000 transfer → 500000 +100000 = 600000
    expect(snapshots[0].accounts["savings"].projected).toBe(600000);
    // i=5 Sep: 5 months of +100000 → 600000 +5×100000 = 1100000
    expect(snapshots[5].accounts["savings"].projected).toBe(1100000);
    // i=6 Oct: transfer makes it 1200000, then ST fires → 1200000 −500000 = 700000
    expect(snapshots[6].accounts["savings"].projected).toBe(700000);
    // i=7 Nov: +100000 → 800000
    expect(snapshots[7].accounts["savings"].projected).toBe(800000);
  });

  it("Mortgage balance decreases by exactly 500000 each October and never goes below zero", () => {
    const snapshots = projectBalances(
      accounts,
      [],
      recurring,
      "2026-04",
      "2026-04",
      60
    );

    // No ST fires before the first October
    expect(snapshots[5].accounts["mortgage"].projected).toBe(2000000);
    // i=6  Oct 2026: first ST  → 2000000 −500000 = 1500000
    expect(snapshots[6].accounts["mortgage"].projected).toBe(1500000);
    // i=18 Oct 2027: second ST → 1500000 −500000 = 1000000
    expect(snapshots[18].accounts["mortgage"].projected).toBe(1000000);
    // i=30 Oct 2028: third ST  → 1000000 −500000 = 500000
    expect(snapshots[30].accounts["mortgage"].projected).toBe(500000);
    // i=42 Oct 2029: fourth ST → 500000 −500000 = 0
    expect(snapshots[42].accounts["mortgage"].projected).toBe(0);
    // All months from payoff onwards: Mortgage stays at 0
    for (let i = 42; i < 60; i++) {
      expect(snapshots[i].accounts["mortgage"].projected).toBe(0);
    }
  });

  it("totalLiquid equals Girokonto + Tagesgeld only at key months", () => {
    const snapshots = projectBalances(
      accounts,
      [],
      recurring,
      "2026-04",
      "2026-04",
      60
    );

    // i=8 Dec 2026: giro=660000, savings=900000 → 1560000
    expect(snapshots[8].totalLiquid).toBe(1560000);
    // i=20 Dec 2027: giro=1140000, savings=1600000 → 2740000
    expect(snapshots[20].totalLiquid).toBe(2740000);
  });

  it("netCashflow is 150000 on non-quarterly months and 120000 on quarterly months (transfers and ST excluded)", () => {
    const snapshots = projectBalances(
      accounts,
      [],
      recurring,
      "2026-04",
      "2026-04",
      60
    );

    // i=0 Apr: quarterly fires → 350000 −200000 −30000 = 120000
    expect(snapshots[0].netCashflow).toBe(120000);
    // i=1 May: no quarterly → 350000 −200000 = 150000
    expect(snapshots[1].netCashflow).toBe(150000);
    // i=6 Oct: quarterly fires; ST is a transfer → excluded → 120000
    expect(snapshots[6].netCashflow).toBe(120000);
    // i=7 Nov: no quarterly → 150000
    expect(snapshots[7].netCashflow).toBe(150000);
  });

  it("Sondertilgung clamping: Tagesgeld is debited only by the remaining Mortgage balance when ST exceeds it", () => {
    const clampAccounts = [
      { id: "savings", kind: "Tagesgeld" as const, openingBalance: 300000 },
      { id: "mortgage", kind: "Mortgage" as const, openingBalance: 300000 },
    ];
    const clampRecurring = [
      {
        accountId: "savings",
        amount: 500000,
        frequency: "annual" as const,
        dayOfMonth: 1,
        isActive: true,
        linkedAccountId: "mortgage",
        monthOfYear: 10,
      },
    ];
    // fromDate Oct 2026 → index 0 is October → ST fires immediately
    // ST amount 500000 > remaining mortgage 300000 → actualDebit = 300000
    const snapshots = projectBalances(
      clampAccounts,
      [],
      clampRecurring,
      "2026-10",
      "2026-10",
      24
    );

    // i=0: savings debited by 300000 only → 300000 −300000 = 0
    expect(snapshots[0].accounts["savings"].projected).toBe(0);
    // i=0: mortgage clamped to 0
    expect(snapshots[0].accounts["mortgage"].projected).toBe(0);
    // i=12 Oct 2027: mortgage already 0 → ST skipped entirely, savings unchanged at 0
    expect(snapshots[12].accounts["savings"].projected).toBe(0);
    expect(snapshots[12].accounts["mortgage"].projected).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Pure function: accepts DTO-shaped account input (`id`, not `_id`)
// ---------------------------------------------------------------------------

describe("projectBalances - accepts DTO shape", () => {
  it("uses `id` (Storage DTO shape) on account input, not the legacy `_id`", () => {
    const accounts = [
      {
        id: "a1",
        kind: "Girokonto" as const,
        openingBalance: 100000,
        openingDate: "2026-04-01",
      },
    ];
    const recurring = [
      {
        accountId: "a1",
        amount: -25000,
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

    // Month 0: 100000 - 25000 = 75000 — must be addressable by `id` "a1"
    expect(snapshots[0].accounts["a1"]).toBeDefined();
    expect(snapshots[0].accounts["a1"].projected).toBe(75000);
    // Month 1: 75000 - 25000 = 50000
    expect(snapshots[1].accounts["a1"].projected).toBe(50000);
  });
});

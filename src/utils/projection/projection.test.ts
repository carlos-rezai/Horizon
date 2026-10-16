import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  findMortgagePayoffMonth,
  findMilestoneMonth,
  buildAccountColumns,
  deriveSTMonths,
  buildTrajectoryData,
  effectiveSTMonths,
  totalRestschuld,
  findDebtFreeMonth,
  stMonthsFor,
  buildPastLeadIn,
} from "./projection";
import { chartColors } from "../../tokens/colors";
import type { MonthlySnapshot } from "../../types/projection";
import type { AccountWithBalance } from "../../types/account";
import type { RecurringTransaction } from "../../types/recurring";
import type { HistoryPoint } from "../../features/history/historyTypes/historyTypes";

const snapshot = (
  month: string,
  accountId: string,
  projected: number
): MonthlySnapshot => ({
  month,
  accounts: { [accountId]: { projected } },
  netCashflow: 0,
  totalLiquid: 0,
});

describe("findMortgagePayoffMonth", () => {
  it("returns the first month where the projected balance reaches zero", () => {
    const id = "mortgage-1";
    const snapshots: MonthlySnapshot[] = [
      snapshot("2026-04", id, 400000),
      snapshot("2026-05", id, 200000),
      snapshot("2026-06", id, 0),
      snapshot("2026-07", id, -50000),
    ];

    expect(findMortgagePayoffMonth(snapshots, id)).toBe("2026-06");
  });

  it("returns the first month that crosses zero, not a later one", () => {
    const id = "mortgage-1";
    const snapshots: MonthlySnapshot[] = [
      snapshot("2026-04", id, 300000),
      snapshot("2026-05", id, 100000),
      snapshot("2026-06", id, -10000),
      snapshot("2026-07", id, -200000),
    ];

    expect(findMortgagePayoffMonth(snapshots, id)).toBe("2026-06");
  });

  it("returns null when the balance never reaches zero", () => {
    const id = "mortgage-1";
    const snapshots: MonthlySnapshot[] = [
      snapshot("2026-04", id, 400000),
      snapshot("2026-05", id, 350000),
      snapshot("2026-06", id, 300000),
    ];

    expect(findMortgagePayoffMonth(snapshots, id)).toBeNull();
  });

  it("returns null when snapshots array is empty", () => {
    expect(findMortgagePayoffMonth([], "mortgage-1")).toBeNull();
  });
});

describe("findMilestoneMonth", () => {
  it("returns the first month where an asset account projected balance meets or exceeds the target", () => {
    const id = "tagesgeld-1";
    const snapshots: MonthlySnapshot[] = [
      snapshot("2026-04", id, 50000),
      snapshot("2026-05", id, 80000),
      snapshot("2026-06", id, 100000),
      snapshot("2026-07", id, 120000),
    ];

    expect(findMilestoneMonth(snapshots, id, 100000, "Tagesgeld")).toBe(
      "2026-06"
    );
  });

  it("returns null when an asset account never reaches the target", () => {
    const id = "tagesgeld-1";
    const snapshots: MonthlySnapshot[] = [
      snapshot("2026-04", id, 50000),
      snapshot("2026-05", id, 60000),
      snapshot("2026-06", id, 70000),
    ];

    expect(findMilestoneMonth(snapshots, id, 100000, "Tagesgeld")).toBeNull();
  });

  it("returns the first month where a Mortgage projected balance falls to or below the target", () => {
    const id = "mortgage-1";
    const snapshots: MonthlySnapshot[] = [
      snapshot("2026-04", id, 4000000),
      snapshot("2026-05", id, 3500000),
      snapshot("2026-06", id, 3000000),
      snapshot("2026-07", id, 2500000),
    ];

    expect(findMilestoneMonth(snapshots, id, 3000000, "Mortgage")).toBe(
      "2026-06"
    );
  });

  it("returns null when a Mortgage balance never falls to the target", () => {
    const id = "mortgage-1";
    const snapshots: MonthlySnapshot[] = [
      snapshot("2026-04", id, 4000000),
      snapshot("2026-05", id, 3800000),
      snapshot("2026-06", id, 3600000),
    ];

    expect(findMilestoneMonth(snapshots, id, 3000000, "Mortgage")).toBeNull();
  });
});

describe("buildAccountColumns", () => {
  const account = (
    id: string,
    name: string,
    kind: AccountWithBalance["kind"]
  ): AccountWithBalance => ({
    id: id,
    kind,
    name,
    anchorBalance: 0,
    anchorDate: "2026-01-01",
    balance: 0,
  });

  it("returns empty array for empty input", () => {
    expect(buildAccountColumns([])).toEqual([]);
  });

  it("excludes Mortgage accounts", () => {
    const accounts = [
      account("m1", "DSL Mortgage", "Mortgage"),
      account("g1", "Main", "Girokonto"),
    ];
    const columns = buildAccountColumns(accounts);
    expect(columns.map((c) => c.id)).not.toContain("m1");
    expect(columns.map((c) => c.id)).toContain("g1");
  });

  it("keeps the input order — the server's sortOrder — rather than grouping by kind", () => {
    const accounts = [
      account("cc1", "Amex", "CreditCard"),
      account("i1", "ETF", "Investment"),
      account("g1", "Main", "Girokonto"),
      account("t1", "Tagesgeld", "Tagesgeld"),
    ];
    const columns = buildAccountColumns(accounts);
    expect(columns.map((c) => c.id)).toEqual(["cc1", "i1", "g1", "t1"]);
  });

  it("includes accounts hidden from the trajectory chart", () => {
    const accounts = [
      { ...account("t1", "Reserve", "Tagesgeld"), showInTrajectory: false },
      account("g1", "Main", "Girokonto"),
    ];
    const columns = buildAccountColumns(accounts);
    expect(columns.map((c) => c.id)).toEqual(["t1", "g1"]);
  });

  it("carries the account's own colour when it has one", () => {
    const accounts = [
      { ...account("g1", "Main", "Girokonto"), color: "#123456" },
    ];
    expect(buildAccountColumns(accounts)[0].color).toBe("#123456");
  });

  it("falls back to the kind's chart colour when the account has none", () => {
    const accounts = [account("i1", "ETF", "Investment")];
    expect(buildAccountColumns(accounts)[0].color).toBe(chartColors.Investment);
  });

  it("preserves account id, name and kind on each output column", () => {
    const accounts = [
      { ...account("g1", "My Girokonto", "Girokonto"), color: "#abcdef" },
    ];
    const columns = buildAccountColumns(accounts);
    expect(columns[0]).toEqual({
      id: "g1",
      name: "My Girokonto",
      kind: "Girokonto",
      color: "#abcdef",
    });
  });

  it("includes multiple accounts of the same kind and preserves their relative order", () => {
    const accounts = [
      account("g1", "Main", "Girokonto"),
      account("g2", "Sparkasse", "Girokonto"),
    ];
    const columns = buildAccountColumns(accounts);
    expect(columns).toHaveLength(2);
    expect(columns[0].id).toBe("g1");
    expect(columns[1].id).toBe("g2");
  });

  it("returns empty array when all accounts are Mortgages", () => {
    const accounts = [
      account("m1", "DSL Mortgage", "Mortgage"),
      account("m2", "Second Mortgage", "Mortgage"),
    ];
    expect(buildAccountColumns(accounts)).toEqual([]);
  });
});

const rt = (
  overrides: Partial<RecurringTransaction> & Pick<RecurringTransaction, "id">
): RecurringTransaction => ({
  accountId: "tagesgeld-1",
  amount: 500000,
  description: "Sondertilgung",
  category: "Mortgage",
  frequency: "annual",
  dayOfMonth: 1,
  ...overrides,
});

const mortgageAccount = { id: "mortgage-1", kind: "Mortgage" as const };
const tagesgeldAccount = { id: "tagesgeld-1", kind: "Tagesgeld" as const };

describe("deriveSTMonths", () => {
  it("returns the correct month and amount for an annual RT whose linkedAccountId is a Mortgage account", () => {
    const recurring = [rt({ id: "rt-1", linkedAccountId: "mortgage-1" })];
    const accounts = [mortgageAccount, tagesgeldAccount];

    const result = deriveSTMonths(recurring, accounts, "2026-01", 12);

    expect(result.has("2026-01")).toBe(true);
    expect(result.get("2026-01")).toBe(500000);
  });

  it("returns multiple ST months when the projection window spans multiple years", () => {
    const recurring = [rt({ id: "rt-1", linkedAccountId: "mortgage-1" })];
    const accounts = [mortgageAccount, tagesgeldAccount];

    const result = deriveSTMonths(recurring, accounts, "2026-01", 24);

    expect(result.has("2026-01")).toBe(true);
    expect(result.has("2027-01")).toBe(true);
    expect(result.size).toBe(2);
  });

  it("never includes monthly recurring transactions", () => {
    const recurring = [
      rt({ id: "rt-1", frequency: "monthly", linkedAccountId: "mortgage-1" }),
    ];
    const accounts = [mortgageAccount, tagesgeldAccount];

    const result = deriveSTMonths(recurring, accounts, "2026-01", 12);

    expect(result.size).toBe(0);
  });

  it("never includes quarterly recurring transactions", () => {
    const recurring = [
      rt({
        id: "rt-1",
        frequency: "quarterly",
        linkedAccountId: "mortgage-1",
      }),
    ];
    const accounts = [mortgageAccount, tagesgeldAccount];

    const result = deriveSTMonths(recurring, accounts, "2026-01", 12);

    expect(result.size).toBe(0);
  });

  it("never includes annual RTs with no linkedAccountId", () => {
    const recurring = [rt({ id: "rt-1" })];
    const accounts = [mortgageAccount, tagesgeldAccount];

    const result = deriveSTMonths(recurring, accounts, "2026-01", 12);

    expect(result.size).toBe(0);
  });

  it("never includes annual RTs whose linkedAccountId points to a non-Mortgage account", () => {
    const investmentAccount = { id: "invest-1", kind: "Investment" as const };
    const recurring = [rt({ id: "rt-1", linkedAccountId: "invest-1" })];
    const accounts = [investmentAccount, tagesgeldAccount];

    const result = deriveSTMonths(recurring, accounts, "2026-01", 12);

    expect(result.size).toBe(0);
  });

  it("returns an empty map when recurringTransactions is empty", () => {
    const accounts = [mortgageAccount, tagesgeldAccount];

    const result = deriveSTMonths([], accounts, "2026-01", 12);

    expect(result.size).toBe(0);
  });

  it("returns an empty map when accounts is empty", () => {
    const recurring = [rt({ id: "rt-1", linkedAccountId: "mortgage-1" })];

    const result = deriveSTMonths(recurring, [], "2026-01", 12);

    expect(result.size).toBe(0);
  });

  it("fires in the monthOfYear month when monthOfYear is set, not in the projection-start month", () => {
    // Projection starts in April, ST should fire in October
    const recurring = [
      rt({ id: "rt-1", linkedAccountId: "mortgage-1", monthOfYear: 10 }),
    ];
    const accounts = [mortgageAccount, tagesgeldAccount];

    const result = deriveSTMonths(recurring, accounts, "2026-04", 12);

    expect(result.has("2026-10")).toBe(true);
    expect(result.has("2026-04")).toBe(false);
  });

  it("fires in the correct monthOfYear month across multiple projected years", () => {
    const recurring = [
      rt({ id: "rt-1", linkedAccountId: "mortgage-1", monthOfYear: 10 }),
    ];
    const accounts = [mortgageAccount, tagesgeldAccount];

    const result = deriveSTMonths(recurring, accounts, "2026-04", 24);

    expect(result.has("2026-10")).toBe(true);
    expect(result.has("2027-10")).toBe(true);
    expect(result.size).toBe(2);
  });

  it("does not fire in the projection-start month when monthOfYear is set to a different month", () => {
    const recurring = [
      rt({ id: "rt-1", linkedAccountId: "mortgage-1", monthOfYear: 10 }),
    ];
    const accounts = [mortgageAccount, tagesgeldAccount];

    const result = deriveSTMonths(recurring, accounts, "2026-04", 12);

    expect(result.has("2026-04")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// buildTrajectoryData
// ---------------------------------------------------------------------------

const trajSnap = (
  month: string,
  totalLiquid: number,
  netCashflow: number,
  accountBalances: Record<string, number> = {}
): MonthlySnapshot => ({
  month,
  totalLiquid,
  netCashflow,
  accounts: Object.fromEntries(
    Object.entries(accountBalances).map(([id, projected]) => [
      id,
      { projected },
    ])
  ),
});

const account = (
  id: string,
  kind: AccountWithBalance["kind"],
  name = id
): AccountWithBalance => ({
  id: id,
  kind,
  name,
  anchorBalance: 0,
  anchorDate: "2026-01-01",
  balance: 0,
});

describe("buildTrajectoryData", () => {
  it("returns an empty array when snapshots is empty", () => {
    expect(buildTrajectoryData([], new Map(), null, [])).toEqual([]);
  });

  it("output length matches input snapshots length", () => {
    const snapshots = [
      trajSnap("2026-04", 100000, 5000),
      trajSnap("2026-05", 105000, 5000),
      trajSnap("2026-06", 110000, 5000),
    ];

    const result = buildTrajectoryData(snapshots, new Map(), null, []);

    expect(result).toHaveLength(3);
  });

  it("each point has all required fields", () => {
    const snapshots = [trajSnap("2026-04", 100000, 5000)];

    const [point] = buildTrajectoryData(snapshots, new Map(), null, []);

    expect(point).toHaveProperty("monthIndex");
    expect(point).toHaveProperty("label");
    expect(point).toHaveProperty("totalLiquid");
    expect(point).toHaveProperty("restschuld");
    expect(point).toHaveProperty("isSTMonth");
    expect(point).toHaveProperty("isPayoffMonth");
  });

  it("does not include netCashflow on the data point", () => {
    const snapshots = [trajSnap("2026-04", 100000, 5000)];

    const [point] = buildTrajectoryData(snapshots, new Map(), null, []);

    expect(point).not.toHaveProperty("netCashflow");
  });

  it("monthIndex is the 0-based position in the array", () => {
    const snapshots = [
      trajSnap("2026-04", 100000, 5000),
      trajSnap("2026-05", 105000, 5000),
      trajSnap("2026-06", 110000, 5000),
    ];

    const result = buildTrajectoryData(snapshots, new Map(), null, []);

    expect(result[0].monthIndex).toBe(0);
    expect(result[1].monthIndex).toBe(1);
    expect(result[2].monthIndex).toBe(2);
  });

  it("label matches the snapshot month string", () => {
    const snapshots = [
      trajSnap("2026-04", 100000, 5000),
      trajSnap("2026-05", 105000, 5000),
    ];

    const result = buildTrajectoryData(snapshots, new Map(), null, []);

    expect(result[0].label).toBe("2026-04");
    expect(result[1].label).toBe("2026-05");
  });

  it("totalLiquid comes from the snapshot", () => {
    const snapshots = [trajSnap("2026-04", 123456, 7890)];

    const [point] = buildTrajectoryData(snapshots, new Map(), null, []);

    expect(point.totalLiquid).toBe(123456);
  });

  it("restschuld is the sum of mortgage account projected balances", () => {
    const snapshots = [
      trajSnap("2026-04", 100000, 0, {
        "mortgage-1": 2000000,
        "mortgage-2": 500000,
        "giro-1": 100000,
      }),
    ];

    const [point] = buildTrajectoryData(snapshots, new Map(), null, [
      account("mortgage-1", "Mortgage"),
      account("mortgage-2", "Mortgage"),
      account("giro-1", "Girokonto"),
    ]);

    expect(point.restschuld).toBe(2500000);
  });

  it("restschuld is 0 when no Mortgage accounts are provided", () => {
    const snapshots = [
      trajSnap("2026-04", 100000, 0, { "mortgage-1": 2000000 }),
    ];

    const [point] = buildTrajectoryData(snapshots, new Map(), null, []);

    expect(point.restschuld).toBe(0);
  });

  it("restschuld is null on and after the month the Mortgage balance reaches zero", () => {
    const snapshots = [
      trajSnap("2026-04", 100000, 0, { "mortgage-1": 200000 }),
      trajSnap("2026-05", 100000, 0, { "mortgage-1": 100000 }),
      trajSnap("2026-06", 100000, 0, { "mortgage-1": 0 }),
      trajSnap("2026-07", 100000, 0, { "mortgage-1": 0 }),
    ];

    const payoffMonth = findDebtFreeMonth(snapshots, ["mortgage-1"]);
    const result = buildTrajectoryData(snapshots, new Map(), payoffMonth, [
      account("mortgage-1", "Mortgage"),
    ]);

    expect(result[0].restschuld).toBe(200000);
    expect(result[1].restschuld).toBe(100000);
    expect(result[2].restschuld).toBeNull();
    expect(result[3].restschuld).toBeNull();
  });

  it("includes per-account projected balance keyed by account id for non-Mortgage accounts", () => {
    const snapshots = [
      trajSnap("2026-04", 0, 0, {
        "giro-1": 500000,
        "tagesgeld-1": 1500000,
        "mortgage-1": 2000000,
      }),
    ];

    const [point] = buildTrajectoryData(snapshots, new Map(), null, [
      account("giro-1", "Girokonto"),
      account("tagesgeld-1", "Tagesgeld"),
      account("mortgage-1", "Mortgage"),
    ]);

    expect(point["giro-1"]).toBe(500000);
    expect(point["tagesgeld-1"]).toBe(1500000);
    expect(point["mortgage-1"]).toBeUndefined();
  });

  it("isSTMonth is true for months present in the stMonths map", () => {
    const snapshots = [
      trajSnap("2026-04", 100000, 0),
      trajSnap("2026-10", 100000, 0),
    ];
    const stMonths = new Map([["2026-10", 500000]]);

    const result = buildTrajectoryData(snapshots, stMonths, null, []);

    expect(result[0].isSTMonth).toBe(false);
    expect(result[1].isSTMonth).toBe(true);
  });

  it("all isSTMonth are false when stMonths map is empty", () => {
    const snapshots = [
      trajSnap("2026-04", 100000, 0),
      trajSnap("2026-05", 100000, 0),
    ];

    const result = buildTrajectoryData(snapshots, new Map(), null, []);

    result.forEach((p) => expect(p.isSTMonth).toBe(false));
  });

  it("isPayoffMonth is true for the payoff month only", () => {
    const snapshots = [
      trajSnap("2026-04", 100000, 0),
      trajSnap("2026-05", 100000, 0),
      trajSnap("2026-06", 100000, 0),
    ];

    const result = buildTrajectoryData(snapshots, new Map(), "2026-05", []);

    expect(result[0].isPayoffMonth).toBe(false);
    expect(result[1].isPayoffMonth).toBe(true);
    expect(result[2].isPayoffMonth).toBe(false);
  });

  it("all isPayoffMonth are false when payoffMonth is null", () => {
    const snapshots = [
      trajSnap("2026-04", 100000, 0),
      trajSnap("2026-05", 100000, 0),
    ];

    const result = buildTrajectoryData(snapshots, new Map(), null, []);

    result.forEach((p) => expect(p.isPayoffMonth).toBe(false));
  });
});

describe("effectiveSTMonths", () => {
  const M = "mortgage-1";

  // One snapshot per month from 2026-10 through 2028-12. The Restschuld is
  // 25 000 until October 2026, 5 000 from November 2026 (a 20 000 Sondertilgung)
  // and zero from November 2027 — the Payoff Month, where only the remaining
  // 5 000 of the next 20 000 transfer is needed.
  const restschuldAt = (month: string): number =>
    month < "2026-11" ? 2500000 : month < "2027-11" ? 500000 : 0;

  const months: string[] = [];
  for (let y = 2026; y <= 2028; y++) {
    for (let m = y === 2026 ? 10 : 1; m <= 12; m++) {
      months.push(`${y}-${String(m).padStart(2, "0")}`);
    }
  }
  const snapshots: MonthlySnapshot[] = months.map((month) =>
    snapshot(month, M, restschuldAt(month))
  );

  const stMonths = new Map<string, number>([
    ["2026-11", 2000000],
    ["2027-11", 2000000],
    ["2028-11", 2000000],
  ]);

  it("keeps an ST month before the Payoff Month at its full amount", () => {
    const result = effectiveSTMonths(stMonths, snapshots, [M]);
    expect(result.get("2026-11")).toBe(2000000);
  });

  it("caps the Payoff Month entry at the Restschuld left the month before", () => {
    const result = effectiveSTMonths(stMonths, snapshots, [M]);
    expect(result.get("2027-11")).toBe(500000);
  });

  it("drops ST months after the Payoff Month", () => {
    const result = effectiveSTMonths(stMonths, snapshots, [M]);
    expect(result.has("2028-11")).toBe(false);
    expect([...result.keys()]).toEqual(["2026-11", "2027-11"]);
  });

  it("keeps every entry when the mortgage is never paid off", () => {
    const neverPaid = months.map((month) => snapshot(month, M, 9000000));
    const result = effectiveSTMonths(stMonths, neverPaid, [M]);
    expect(Object.fromEntries(result)).toEqual({
      "2026-11": 2000000,
      "2027-11": 2000000,
      "2028-11": 2000000,
    });
  });

  it("returns an empty map when there is no mortgage", () => {
    expect(effectiveSTMonths(stMonths, snapshots, []).size).toBe(0);
  });

  it("returns an empty map when there is no ST month", () => {
    expect(effectiveSTMonths(new Map(), snapshots, [M]).size).toBe(0);
  });
});

describe("totalRestschuld", () => {
  const month: MonthlySnapshot = {
    month: "2031-09",
    accounts: {
      "mortgage-1": { projected: 500000, actual: 900000 },
      "mortgage-2": { projected: 300000 },
      "giro-1": { projected: 120000 },
    },
    netCashflow: 0,
    totalLiquid: 120000,
  };

  it("is 0 with no mortgages", () => {
    expect(totalRestschuld(month, [])).toBe(0);
  });

  it("sums every mortgage's projected balance, never the actual", () => {
    expect(totalRestschuld(month, ["mortgage-1", "mortgage-2"])).toBe(800000);
  });

  it("counts a mortgage missing from the month as 0", () => {
    expect(totalRestschuld(month, ["mortgage-1", "mortgage-9"])).toBe(500000);
  });
});

describe("findDebtFreeMonth", () => {
  const twoMortgages = (
    month: string,
    m1: number,
    m2: number
  ): MonthlySnapshot => ({
    month,
    accounts: { m1: { projected: m1 }, m2: { projected: m2 } },
    netCashflow: 0,
    totalLiquid: 0,
  });

  const snapshots = [
    twoMortgages("2026-11", 300000, 600000),
    twoMortgages("2026-12", 0, 400000),
    twoMortgages("2027-01", 0, 200000),
    twoMortgages("2027-02", 0, 0),
    twoMortgages("2027-03", 0, 0),
  ];

  it("returns the first month the combined Restschuld reaches zero", () => {
    expect(findDebtFreeMonth(snapshots, ["m1", "m2"])).toBe("2027-02");
  });

  it("is null with no mortgages", () => {
    expect(findDebtFreeMonth(snapshots, [])).toBeNull();
  });

  it("is null when the combined Restschuld never reaches zero", () => {
    expect(findDebtFreeMonth(snapshots.slice(0, 3), ["m1", "m2"])).toBeNull();
  });

  it("equals the Payoff Month with one mortgage", () => {
    for (const id of ["m1", "m2"]) {
      expect(findDebtFreeMonth(snapshots, [id])).toBe(
        findMortgagePayoffMonth(snapshots, id)
      );
    }
    expect(findDebtFreeMonth(snapshots.slice(0, 1), ["m1"])).toBe(
      findMortgagePayoffMonth(snapshots.slice(0, 1), "m1")
    );
  });
});

describe("stMonthsFor — the real-world reference case", () => {
  // €955/month and €6,500 each November into the Mortgage, starting October
  // 2026 with €89,500 Restschuld: the loan is paid off in October 2031, so
  // the Novembers 2026–2030 are the only Sondertilgung that count.
  const MONTHLY = 95500;
  const ANNUAL = 650000;
  const recurring: RecurringTransaction[] = [
    {
      id: "r-monthly",
      accountId: "g1",
      amount: MONTHLY,
      description: "Darlehen",
      category: "Housing",
      frequency: "monthly",
      dayOfMonth: 1,
      linkedAccountId: "m1",
    },
    {
      id: "r-annual",
      accountId: "g1",
      amount: ANNUAL,
      description: "Sondertilgung",
      category: "Housing",
      frequency: "annual",
      dayOfMonth: 1,
      linkedAccountId: "m1",
      monthOfYear: 11,
    },
  ];
  const accounts = [
    { id: "g1", kind: "Girokonto" as const },
    { id: "m1", kind: "Mortgage" as const },
  ];

  const snapshots: MonthlySnapshot[] = [];
  let restschuld = 8950000;
  for (let i = 0; i < 240; i++) {
    const year = 2026 + Math.floor((9 + i) / 12);
    const monthNum = ((9 + i) % 12) + 1;
    if (i > 0) {
      restschuld -= MONTHLY;
      if (monthNum === 11) restschuld -= ANNUAL;
      restschuld = Math.max(0, restschuld);
    }
    snapshots.push({
      month: `${year}-${String(monthNum).padStart(2, "0")}`,
      accounts: { m1: { projected: restschuld } },
      netCashflow: 0,
      totalLiquid: 0,
    });
  }

  it("keeps the five Novembers before the October 2031 payoff", () => {
    const st = stMonthsFor(recurring, accounts, snapshots);

    expect([...st.keys()]).toEqual([
      "2026-11",
      "2027-11",
      "2028-11",
      "2029-11",
      "2030-11",
    ]);
    expect([...st.values()].every((amount) => amount === ANNUAL)).toBe(true);
  });

  it("matches the composition it wraps", () => {
    expect(stMonthsFor(recurring, accounts, snapshots)).toEqual(
      effectiveSTMonths(
        deriveSTMonths(recurring, accounts, snapshots[0].month, 240),
        snapshots,
        ["m1"]
      )
    );
  });

  it("is empty with no snapshots", () => {
    expect(stMonthsFor(recurring, accounts, []).size).toBe(0);
  });
});

describe("buildPastLeadIn", () => {
  // Today is October 2026: the history runs through 2026-10, and the lead-in
  // is every month before it.
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-16T12:00:00Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  const giro: AccountWithBalance = {
    id: "g1",
    kind: "Girokonto",
    name: "Main",
    anchorBalance: 0,
    anchorDate: "2026-01-01",
    balance: 0,
  };
  const mortgage: AccountWithBalance = {
    id: "m1",
    kind: "Mortgage",
    name: "DSL Mortgage",
    anchorBalance: 0,
    anchorDate: "2026-01-01",
    balance: 0,
  };

  function monthBefore(month: string, n: number): string {
    const [y, m] = month.split("-").map((part) => parseInt(part, 10));
    const total = y * 12 + (m - 1) - n;
    return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}`;
  }

  function point(month: string, overrides: Partial<HistoryPoint> = {}) {
    return {
      month,
      totalLiquid: 100000,
      restschuld: 5000000,
      restschuldBridge: null,
      netCashflow: 0,
      accounts: { g1: 100000, m1: 5000000 },
      ...overrides,
    } satisfies HistoryPoint;
  }

  /** `count` consecutive points ending with the current month, oldest first. */
  function historyThroughToday(count: number): HistoryPoint[] {
    return Array.from({ length: count }, (_, i) =>
      point(monthBefore("2026-10", count - 1 - i))
    );
  }

  it("returns no rows for no points", () => {
    expect(buildPastLeadIn([], [giro, mortgage])).toEqual([]);
  });

  it("leaves out the current month, which comes from the projection", () => {
    const rows = buildPastLeadIn(historyThroughToday(4), [giro, mortgage]);

    expect(rows.map((r) => r.label)).toEqual(["2026-07", "2026-08", "2026-09"]);
  });

  it("caps the lead-in at the 120 most recent past months", () => {
    const rows = buildPastLeadIn(historyThroughToday(140), [giro, mortgage]);

    expect(rows).toHaveLength(120);
    expect(rows[0].label).toBe(monthBefore("2026-10", 120));
    expect(rows[rows.length - 1].label).toBe("2026-09");
  });

  it("keys each row with the projection rows' series keys plus the bridge", () => {
    const projectionRow = buildTrajectoryData(
      [
        {
          month: "2026-10",
          accounts: { g1: { projected: 100000 }, m1: { projected: 5000000 } },
          netCashflow: 0,
          totalLiquid: 100000,
        },
      ],
      new Map(),
      null,
      [giro, mortgage]
    )[0];
    const seriesKeys = ["totalLiquid", "restschuld", "g1"];
    for (const key of seriesKeys) expect(projectionRow).toHaveProperty(key);

    const [row] = buildPastLeadIn(
      [
        point("2026-09", {
          totalLiquid: 80000,
          restschuld: 5100000,
          accounts: { g1: 80000, m1: 5100000 },
        }),
        point("2026-10"),
      ],
      [giro, mortgage]
    );

    expect(row).toMatchObject({
      label: "2026-09",
      totalLiquid: 80000,
      restschuld: 5100000,
      g1: 80000,
    });
    expect(row).toHaveProperty("restschuldBridge");
    expect(row).not.toHaveProperty("m1");
  });

  it("keeps Unknown values as null, never 0", () => {
    const [unknown, bridged] = buildPastLeadIn(
      [
        point("2026-07", {
          totalLiquid: null,
          restschuld: null,
          restschuldBridge: null,
          accounts: { g1: null, m1: null },
        }),
        point("2026-08", {
          totalLiquid: null,
          restschuld: null,
          restschuldBridge: 5200000,
          accounts: { g1: null, m1: null },
        }),
        point("2026-10"),
      ],
      [giro, mortgage]
    );

    expect(unknown.totalLiquid).toBeNull();
    expect(unknown.restschuld).toBeNull();
    expect(unknown.restschuldBridge).toBeNull();
    expect(unknown.g1).toBeNull();
    expect(bridged.restschuld).toBeNull();
    expect(bridged.restschuldBridge).toBe(5200000);
  });
});

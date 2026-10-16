import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
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

// A Mortgage Setup body: 200,000 € Restschuld today, originated at 400,000 €
// in June 2020 over 25 years. Amounts in cents.
const validSetup = {
  name: "Haus",
  openingBalance: 20000000,
  openingDate: "2026-10-16",
  originalPrincipal: 40000000,
  startDate: "2020-06-01",
  termYears: 25,
};

async function mortgageCount(): Promise<number> {
  const res = await request(app).get("/accounts");
  return (res.body as { kind: string }[]).filter((a) => a.kind === "Mortgage")
    .length;
}

describe("POST /mortgages — valid setup", () => {
  it("creates the Mortgage account and answers it with its balance", async () => {
    const res = await request(app).post("/mortgages").send(validSetup);

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.kind).toBe("Mortgage");
    expect(res.body.name).toBe("Haus");
    expect(res.body.openingBalance).toBe(20000000);
    expect(res.body.openingDate).toBe("2026-10-16");
    expect(res.body.balance).toBe(20000000);
  });

  it("writes the origination onto the created account", async () => {
    const res = await request(app).post("/mortgages").send(validSetup);

    expect(res.body.originalPrincipal).toBe(40000000);
    expect(res.body.startDate).toBe("2020-06-01");
    expect(res.body.termYears).toBe(25);

    const stored = await request(app).get(`/accounts/${res.body.id}`);
    expect(stored.status).toBe(200);
    expect(stored.body.kind).toBe("Mortgage");
    expect(stored.body.originalPrincipal).toBe(40000000);
    expect(stored.body.startDate).toBe("2020-06-01");
    expect(stored.body.termYears).toBe(25);
  });

  it("accepts the boundary values: principal equal to Restschuld, start on the as-of date, terms of 1 and 40 years", async () => {
    const equal = await request(app)
      .post("/mortgages")
      .send({
        ...validSetup,
        originalPrincipal: validSetup.openingBalance,
        startDate: validSetup.openingDate,
        termYears: 1,
      });
    const longest = await request(app)
      .post("/mortgages")
      .send({ ...validSetup, termYears: 40 });

    expect(equal.status).toBe(201);
    expect(longest.status).toBe(201);
    expect(await mortgageCount()).toBe(2);
  });
});

describe("POST /mortgages — invalid setup", () => {
  it.each([
    [
      "the original principal is below the Restschuld",
      { originalPrincipal: 19999999 },
    ],
    ["the start date is after the as-of date", { startDate: "2026-10-17" }],
    ["the term is 0 years", { termYears: 0 }],
    ["the term is 41 years", { termYears: 41 }],
    ["the term is not a whole number of years", { termYears: 2.5 }],
    ["the Restschuld is zero", { openingBalance: 0 }],
    ["the Restschuld is negative", { openingBalance: -100 }],
    [
      "the original principal is zero",
      { openingBalance: 0, originalPrincipal: 0 },
    ],
    ["the original principal is negative", { originalPrincipal: -40000000 }],
    ["the name is empty", { name: "" }],
  ])("answers 400 with issues when %s", async (_label, override) => {
    const res = await request(app)
      .post("/mortgages")
      .send({ ...validSetup, ...override });

    expect(res.status).toBe(400);
    expect(Array.isArray(res.body.issues)).toBe(true);
    expect(res.body.issues.length).toBeGreaterThan(0);
  });

  it("creates no account when the body is invalid", async () => {
    const res = await request(app)
      .post("/mortgages")
      .send({ ...validSetup, termYears: 41 });

    expect(res.status).toBe(400);
    expect(await mortgageCount()).toBe(0);
  });
});

// Live-Use Repair #2 (issue #227): Mortgage Setup also writes the repayment —
// a monthly Recurring Transfer and an optional annual Sondertilgung, each from
// the paid-from account into the new Mortgage.

interface StoredRecurring {
  id: string;
  accountId: string;
  linkedAccountId?: string;
  amount: number;
  description: string;
  category: string;
  frequency: string;
  dayOfMonth: number;
  monthOfYear?: number;
}

async function createAccount(
  kind: string,
  name: string,
  openingBalance = 500000
): Promise<string> {
  const res = await request(app).post("/accounts").send({
    kind,
    name,
    openingBalance,
    openingDate: "2026-01-01",
  });
  expect(res.status).toBe(201);
  return res.body.id as string;
}

async function allRecurring(): Promise<StoredRecurring[]> {
  const res = await request(app).get("/recurring-transactions");
  return res.body as StoredRecurring[];
}

/** 1,500 € a month on the 3rd, plus 5,000 € Sondertilgung every November. */
function repaymentFrom(paidFromAccountId: string) {
  return {
    paidFromAccountId,
    monthlyAmount: 150000,
    dayOfMonth: 3,
    sondertilgungAmount: 500000,
    sondertilgungMonth: 11,
  };
}

describe("POST /mortgages — with a repayment", () => {
  it("writes no Recurring Transfer when the setup has no repayment", async () => {
    const res = await request(app).post("/mortgages").send(validSetup);

    expect(res.status).toBe(201);
    expect(await allRecurring()).toHaveLength(0);
  });

  it("writes one monthly Recurring Transfer from the paid-from account into the Mortgage when no Sondertilgung is given", async () => {
    const giro = await createAccount("Girokonto", "Giro");
    const res = await request(app)
      .post("/mortgages")
      .send({
        ...validSetup,
        repayment: {
          paidFromAccountId: giro,
          monthlyAmount: 150000,
          dayOfMonth: 3,
        },
      });

    expect(res.status).toBe(201);
    const recurring = await allRecurring();
    expect(recurring).toHaveLength(1);
    expect(recurring[0]).toMatchObject({
      accountId: giro,
      linkedAccountId: res.body.id,
      amount: 150000,
      description: "Mortgage repayment",
      category: "Transfer",
      frequency: "monthly",
      dayOfMonth: 3,
    });
  });

  it("writes the monthly repayment and the annual Sondertilgung when both are given", async () => {
    const giro = await createAccount("Girokonto", "Giro");
    const res = await request(app)
      .post("/mortgages")
      .send({ ...validSetup, repayment: repaymentFrom(giro) });

    expect(res.status).toBe(201);
    const recurring = await allRecurring();
    expect(recurring).toHaveLength(2);

    const monthly = recurring.find((r) => r.frequency === "monthly");
    const annual = recurring.find((r) => r.frequency === "annual");
    expect(monthly).toMatchObject({
      accountId: giro,
      linkedAccountId: res.body.id,
      amount: 150000,
      description: "Mortgage repayment",
      category: "Transfer",
      dayOfMonth: 3,
    });
    expect(annual).toMatchObject({
      accountId: giro,
      linkedAccountId: res.body.id,
      amount: 500000,
      description: "Sondertilgung",
      category: "Transfer",
      dayOfMonth: 3,
      monthOfYear: 11,
    });
  });

  it("accepts a Tagesgeld as the paid-from account", async () => {
    const tagesgeld = await createAccount("Tagesgeld", "Reserve");
    const res = await request(app)
      .post("/mortgages")
      .send({ ...validSetup, repayment: repaymentFrom(tagesgeld) });

    expect(res.status).toBe(201);
    const recurring = await allRecurring();
    expect(recurring).toHaveLength(2);
    expect(recurring.every((r) => r.accountId === tagesgeld)).toBe(true);
  });

  it("projects the Mortgage to payoff and lists the transfers on the paid-from account", async () => {
    const giro = await createAccount("Girokonto", "Giro", 100000000);
    const res = await request(app)
      .post("/mortgages")
      .send({ ...validSetup, repayment: repaymentFrom(giro) });
    expect(res.status).toBe(201);
    const mortgageId = res.body.id as string;

    const projection = await request(app).get("/projection?months=240");
    expect(projection.status).toBe(200);
    const snapshots = projection.body as {
      month: string;
      accounts: Record<string, { projected: number }>;
    }[];
    expect(
      snapshots.some((s) => (s.accounts[mortgageId]?.projected ?? 1) <= 0)
    ).toBe(true);

    const onPaidFrom = (await allRecurring()).filter(
      (r) => r.accountId === giro || r.linkedAccountId === giro
    );
    expect(onPaidFrom.map((r) => r.description).sort()).toEqual([
      "Mortgage repayment",
      "Sondertilgung",
    ]);
  });
});

describe("POST /mortgages — invalid repayment", () => {
  it.each([
    [
      "a Sondertilgung amount is given without its month",
      { sondertilgungMonth: undefined },
    ],
    ["the monthly rate is zero", { monthlyAmount: 0 }],
    ["the monthly rate is negative", { monthlyAmount: -150000 }],
    ["the Sondertilgung amount is zero", { sondertilgungAmount: 0 }],
    ["the Sondertilgung amount is negative", { sondertilgungAmount: -500000 }],
    ["the day of month is 0", { dayOfMonth: 0 }],
    ["the day of month is 32", { dayOfMonth: 32 }],
    ["the Sondertilgung month is 13", { sondertilgungMonth: 13 }],
  ])("answers 400 with issues when %s", async (_label, override) => {
    const giro = await createAccount("Girokonto", "Giro");
    const res = await request(app)
      .post("/mortgages")
      .send({
        ...validSetup,
        repayment: { ...repaymentFrom(giro), ...override },
      });

    expect(res.status).toBe(400);
    expect(Array.isArray(res.body.issues)).toBe(true);
    expect(res.body.issues.length).toBeGreaterThan(0);
    expect(await mortgageCount()).toBe(0);
    expect(await allRecurring()).toHaveLength(0);
  });

  it.each([
    ["a CreditCard", "CreditCard"],
    ["an Investment account", "Investment"],
    ["another Mortgage", "Mortgage"],
  ])(
    "answers 400 with issues when the paid-from account is %s",
    async (_label, kind) => {
      const ineligible = await createAccount(kind, "Not a paid-from account");
      const res = await request(app)
        .post("/mortgages")
        .send({ ...validSetup, repayment: repaymentFrom(ineligible) });

      expect(res.status).toBe(400);
      expect(Array.isArray(res.body.issues)).toBe(true);
      expect(res.body.issues.length).toBeGreaterThan(0);
      expect(
        (await request(app).get("/accounts")).body.filter(
          (a: { name: string }) => a.name === "Haus"
        )
      ).toHaveLength(0);
      expect(await allRecurring()).toHaveLength(0);
    }
  );

  it("answers 400 with issues when the paid-from account does not exist", async () => {
    const res = await request(app)
      .post("/mortgages")
      .send({ ...validSetup, repayment: repaymentFrom("no-such-account") });

    expect(res.status).toBe(400);
    expect(Array.isArray(res.body.issues)).toBe(true);
    expect(res.body.issues.length).toBeGreaterThan(0);
    expect(await mortgageCount()).toBe(0);
  });
});

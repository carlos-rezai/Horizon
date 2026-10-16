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

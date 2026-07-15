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

// ---------------------------------------------------------------------------
// GET /savings-goal
//
// The card always has something to render: when no goal row exists the route
// answers with a sensible default (manual mode, no per-account targets). Once a
// goal has been persisted the route returns it verbatim. The write path
// (PUT /savings-goal) lands in Phase 3, so this suite seeds a stored config
// directly through the repo.
// ---------------------------------------------------------------------------

describe("GET /savings-goal", () => {
  it("returns a sensible default config when no goal has been saved", async () => {
    const res = await request(app).get("/savings-goal");

    expect(res.status).toBe(200);
    expect(res.body.mode).toBe("manual");
    expect(res.body.manualMonthly).toEqual({});
    expect(typeof res.body.targetTotal).toBe("number");
    expect(res.body.targetDate).toMatch(/^\d{4}-\d{2}$/);
    expect(res.body.startedAt).toMatch(/^\d{4}-\d{2}$/);
  });

  it("returns the stored config once a goal has been saved", async () => {
    const config = {
      mode: "manual",
      targetTotal: 1000000,
      targetDate: "2028-01",
      startedAt: "2026-01",
      manualMonthly: { a1: 50000 },
    };
    await app.locals.storage.savingsGoal.upsert(config);

    const res = await request(app).get("/savings-goal");

    expect(res.status).toBe(200);
    expect(res.body).toEqual(config);
  });
});

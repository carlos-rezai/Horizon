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

// ---------------------------------------------------------------------------
// PUT /savings-goal
//
// The write path. A valid config is validated and persisted through the repo;
// GET then returns it verbatim. The one piece of server-owned policy is
// `startedAt`: it is stamped to the current month on the first-ever save and
// fixed thereafter, so a client can never move the point cumulative progress is
// measured from. Malformed bodies are rejected with 400 and never persisted.
// ---------------------------------------------------------------------------

/** The current month as "YYYY-MM" — what the route stamps onto a first save. */
function currentYearMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

describe("PUT /savings-goal", () => {
  it("persists a valid config and round-trips it against GET", async () => {
    const config = {
      mode: "manual",
      targetTotal: 0,
      targetDate: "2026-12",
      startedAt: "2026-01",
      manualMonthly: { a1: 80000, a2: 50000 },
    };

    const putRes = await request(app).put("/savings-goal").send(config);
    expect(putRes.status).toBe(200);

    const getRes = await request(app).get("/savings-goal");
    expect(getRes.status).toBe(200);
    expect(getRes.body.mode).toBe("manual");
    expect(getRes.body.manualMonthly).toEqual({ a1: 80000, a2: 50000 });
    expect(getRes.body.targetDate).toBe("2026-12");
  });

  it("stamps startedAt to the current month on the first-ever save", async () => {
    // The client sends a stale startedAt; the route ignores it on a first save.
    const config = {
      mode: "manual",
      targetTotal: 0,
      targetDate: "2026-12",
      startedAt: "2020-01",
      manualMonthly: { a1: 1000 },
    };

    await request(app).put("/savings-goal").send(config);

    const res = await request(app).get("/savings-goal");
    // The persisted targets prove the save landed (not just the unsaved
    // default), and startedAt is stamped to the current month regardless of the
    // stale value the client sent.
    expect(res.body.manualMonthly).toEqual({ a1: 1000 });
    expect(res.body.startedAt).toBe(currentYearMonth());
  });

  it("never moves startedAt on subsequent saves", async () => {
    await request(app)
      .put("/savings-goal")
      .send({
        mode: "manual",
        targetTotal: 0,
        targetDate: "2026-12",
        startedAt: "2020-01",
        manualMonthly: { a1: 1000 },
      });
    const firstStartedAt = (await request(app).get("/savings-goal")).body
      .startedAt;

    // A later save carries a different startedAt and different targets; only the
    // targets are allowed to move.
    await request(app)
      .put("/savings-goal")
      .send({
        mode: "manual",
        targetTotal: 0,
        targetDate: "2027-01",
        startedAt: "1999-09",
        manualMonthly: { a1: 2000 },
      });

    const res = await request(app).get("/savings-goal");
    expect(res.body.startedAt).toBe(firstStartedAt);
    expect(res.body.manualMonthly).toEqual({ a1: 2000 });
  });

  it("rejects a config with an invalid mode and persists nothing", async () => {
    const res = await request(app).put("/savings-goal").send({
      mode: "banana",
      targetTotal: 0,
      targetDate: "2026-12",
      startedAt: "2026-01",
      manualMonthly: {},
    });

    expect(res.status).toBe(400);

    // The default (unsaved) config still comes back from GET.
    const getRes = await request(app).get("/savings-goal");
    expect(getRes.body.manualMonthly).toEqual({});
  });

  it("rejects a config whose manualMonthly holds a non-numeric target", async () => {
    const res = await request(app)
      .put("/savings-goal")
      .send({
        mode: "manual",
        targetTotal: 0,
        targetDate: "2026-12",
        startedAt: "2026-01",
        manualMonthly: { a1: "lots" },
      });

    expect(res.status).toBe(400);
  });
});

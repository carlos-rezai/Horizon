import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { createApp } from "../app.js";
import type { Storage, StorageStatus } from "../storage/Storage.js";
import { createSqliteAppHandle } from "./helpers/sqliteApp.js";

// ---------------------------------------------------------------------------
// SQLite — real driver behind createApp, mirroring the existing route tests
// ---------------------------------------------------------------------------

describe("GET /storage/status — SQLite driver", () => {
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

  it("returns 200 with the SQLite-shaped status payload", async () => {
    const res = await request(app).get("/storage/status");

    expect(res.status).toBe(200);
    expect(res.body.driver).toBe("sqlite");
    expect(typeof res.body.schemaVersion).toBe("number");
    expect(res.body.schemaVersion).toBeGreaterThan(0);
    expect(res.body.integrity).toBe("ok");
    expect(res.body.path).toBe(":memory:");
    expect(typeof res.body.sizeBytes).toBe("number");
    expect(res.body.sizeBytes).toBeGreaterThanOrEqual(0);
  });
});

// ---------------------------------------------------------------------------
// Mongo — stub the Storage facade so we exercise the route's response shape
// without spinning up a real Mongo (the parity spec covers driver behaviour)
// ---------------------------------------------------------------------------

describe("GET /storage/status — Mongo driver (stubbed)", () => {
  let app: Express;

  beforeAll(async () => {
    process.env.AUTH_DISABLED = "1";
    const mongoStub: Storage = {
      accounts: {} as Storage["accounts"],
      transactions: {} as Storage["transactions"],
      transfers: {} as Storage["transfers"],
      categories: {} as Storage["categories"],
      milestones: {} as Storage["milestones"],
      recurringTransactions: {} as Storage["recurringTransactions"],
      close: async () => undefined,
      backup: async () => {
        throw new Error("not supported");
      },
      restore: async () => {
        throw new Error("not supported");
      },
      status: async (): Promise<StorageStatus> => ({
        driver: "mongo",
        schemaVersion: 0,
        integrity: "ok",
      }),
    };
    app = await createApp(mongoStub);
  });

  it("returns 200 with the Mongo-shaped status payload and no path/sizeBytes", async () => {
    const res = await request(app).get("/storage/status");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      driver: "mongo",
      schemaVersion: 0,
      integrity: "ok",
    });
    expect(res.body.path).toBeUndefined();
    expect(res.body.sizeBytes).toBeUndefined();
  });
});

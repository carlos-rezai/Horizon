import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";
import request from "supertest";
import fs from "fs";
import os from "os";
import path from "path";
import type { Express } from "express";
import { createApp } from "../app.js";
import type { Storage, StorageStatus } from "../storage/Storage.js";
import { createSqliteAppHandle } from "./helpers/sqliteApp.js";

// ---------------------------------------------------------------------------
// SQLite — real driver behind createApp
// ---------------------------------------------------------------------------

describe("POST /api/storage/backup — SQLite driver", () => {
  let app: Express;
  let reset: () => Promise<void>;
  let cleanup: () => Promise<void>;

  function snapshotBackupTempEntries(): Set<string> {
    return new Set(
      fs
        .readdirSync(os.tmpdir())
        .filter((name) => name.startsWith("horizon-backup-"))
    );
  }

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

  it("returns 200", async () => {
    const res = await request(app)
      .post("/api/storage/backup")
      .buffer(true)
      .parse((response, callback) => {
        const chunks: Buffer[] = [];
        response.on("data", (chunk: Buffer) => chunks.push(chunk));
        response.on("end", () => callback(null, Buffer.concat(chunks)));
      });

    expect(res.status).toBe(200);
  });

  it("sets Content-Disposition: attachment with a .db filename", async () => {
    const res = await request(app)
      .post("/api/storage/backup")
      .buffer(true)
      .parse((response, callback) => {
        const chunks: Buffer[] = [];
        response.on("data", (chunk: Buffer) => chunks.push(chunk));
        response.on("end", () => callback(null, Buffer.concat(chunks)));
      });

    const disposition = res.headers["content-disposition"];
    expect(disposition).toBeDefined();
    expect(String(disposition)).toMatch(/attachment/i);
    expect(String(disposition)).toMatch(/\.db(["']?\s*;?|$)/i);
  });

  it("streams a body that begins with the SQLite magic header", async () => {
    const res = await request(app)
      .post("/api/storage/backup")
      .buffer(true)
      .parse((response, callback) => {
        const chunks: Buffer[] = [];
        response.on("data", (chunk: Buffer) => chunks.push(chunk));
        response.on("end", () => callback(null, Buffer.concat(chunks)));
      });

    const body = res.body as Buffer;
    expect(Buffer.isBuffer(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
    expect(body.subarray(0, 16).toString("utf8")).toBe("SQLite format 3\0");
  });

  it("does not leak horizon-backup-* temp entries after the response completes", async () => {
    const before = snapshotBackupTempEntries();

    await request(app)
      .post("/api/storage/backup")
      .buffer(true)
      .parse((response, callback) => {
        const chunks: Buffer[] = [];
        response.on("data", (chunk: Buffer) => chunks.push(chunk));
        response.on("end", () => callback(null, Buffer.concat(chunks)));
      });

    const after = snapshotBackupTempEntries();
    const newEntries = [...after].filter((name) => !before.has(name));
    expect(newEntries).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Mongo — stub the Storage facade so the route surfaces the asymmetry as 501
// ---------------------------------------------------------------------------

describe("POST /api/storage/backup — Mongo driver (stubbed)", () => {
  let app: Express;

  beforeEach(async () => {
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

  it("returns 501", async () => {
    const res = await request(app).post("/api/storage/backup");
    expect(res.status).toBe(501);
  });

  it("returns a stable error body", async () => {
    const res = await request(app).post("/api/storage/backup");
    expect(res.body).toEqual({ error: "not supported" });
  });
});

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
import type { Express } from "express";
import { createApp } from "../app.js";
import { createSqliteAppHandle } from "./helpers/sqliteApp.js";
import { createMongoStorageStub } from "./helpers/mongoStorageStub.js";

// ---------------------------------------------------------------------------
// SQLite — real driver behind createApp
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

describe("POST /storage/backup — SQLite driver", () => {
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
      .post("/storage/backup")
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
      .post("/storage/backup")
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
      .post("/storage/backup")
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
      .post("/storage/backup")
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
// Mongo — stub the Storage facade so we exercise the route's response shape
// without spinning up a real Mongo (the parity spec covers driver behaviour)
// ---------------------------------------------------------------------------

describe("GET /storage/status — Mongo driver (stubbed)", () => {
  let app: Express;

  beforeAll(async () => {
    process.env.AUTH_DISABLED = "1";
    app = await createApp(createMongoStorageStub());
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

describe("POST /storage/backup — Mongo driver (stubbed)", () => {
  let app: Express;

  beforeEach(async () => {
    process.env.AUTH_DISABLED = "1";
    app = await createApp(createMongoStorageStub());
  });

  it("returns 400 when the driver does not support backup", async () => {
    const res = await request(app).post("/storage/backup");
    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: "Storage driver does not support backup",
    });
  });
});

describe("POST /storage/backup — non-supported failure (stubbed)", () => {
  let app: Express;

  beforeEach(async () => {
    process.env.AUTH_DISABLED = "1";
    app = await createApp(
      createMongoStorageStub({
        backup: async () => {
          throw new Error("disk full");
        },
      })
    );
  });

  it("does not return 400 for a non-'not supported' failure", async () => {
    const res = await request(app).post("/storage/backup");
    expect(res.status).not.toBe(400);
    expect(res.status).toBeGreaterThanOrEqual(500);
  });
});

describe("POST /storage/restore — Mongo driver (stubbed)", () => {
  let app: Express;

  beforeEach(async () => {
    process.env.AUTH_DISABLED = "1";
    app = await createApp(createMongoStorageStub());
  });

  it("returns 400 when the driver does not support restore", async () => {
    const res = await request(app).post("/storage/restore");
    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: "Storage driver does not support restore",
    });
  });
});

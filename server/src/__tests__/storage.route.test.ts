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
import Database from "better-sqlite3";
import fs from "fs";
import os from "os";
import path from "path";
import type { Express } from "express";
import { createApp } from "../app.js";
import { createStorage } from "../storage/index.js";
import type { Storage } from "../storage/Storage.js";
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

describe("POST /storage/restore — SQLite driver", () => {
  let app: Express;
  let storage: Storage;
  let livePath: string;
  let tmpDir: string;

  beforeEach(async () => {
    process.env.AUTH_DISABLED = "1";
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "horizon-restore-route-"));
    livePath = path.join(tmpDir, "live.db");
    storage = await createStorage("sqlite", { path: livePath });
    app = await createApp(storage);
  });

  afterEach(async () => {
    await storage.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  async function makeValidBackup(): Promise<string> {
    const snapPath = path.join(tmpDir, "snap.db");
    await storage.backup(snapPath);
    return snapPath;
  }

  it("returns 204 and the live data is replaced by the backup snapshot", async () => {
    const before = await storage.accounts.create({
      name: "Pre-restore",
      kind: "Girokonto",
      openingBalance: 1234,
      openingDate: "2026-01-01",
    });

    const snapPath = await makeValidBackup();

    await storage.accounts.delete(before.id);
    const after = await storage.accounts.create({
      name: "Post-restore",
      kind: "Tagesgeld",
      openingBalance: 7777,
      openingDate: "2026-02-01",
    });

    const res = await request(app)
      .post("/storage/restore")
      .attach("file", snapPath);

    expect(res.status).toBe(204);

    const accountsRes = await request(app).get("/accounts");
    expect(accountsRes.status).toBe(200);
    const ids = (accountsRes.body as Array<{ id: string }>).map((a) => a.id);
    expect(ids).toContain(before.id);
    expect(ids).not.toContain(after.id);
  });

  it("returns 400 when no file is uploaded", async () => {
    const res = await request(app).post("/storage/restore");
    expect(res.status).toBe(400);
  });

  it("returns 400 with the integrity-check message for a corrupt file and leaves live data untouched", async () => {
    const before = await storage.accounts.create({
      name: "Pre-corrupt",
      kind: "Girokonto",
      openingBalance: 999,
      openingDate: "2026-01-01",
    });

    const corruptPath = path.join(tmpDir, "corrupt.db");
    fs.writeFileSync(corruptPath, Buffer.from("not a sqlite database"));

    const res = await request(app)
      .post("/storage/restore")
      .attach("file", corruptPath);

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: "Backup file failed integrity check",
    });

    const accountsRes = await request(app).get("/accounts");
    const ids = (accountsRes.body as Array<{ id: string }>).map((a) => a.id);
    expect(ids).toContain(before.id);
  });

  it("returns 400 with the future-schema message when the source user_version is ahead", async () => {
    const futurePath = path.join(tmpDir, "future.db");
    const futureDb = new Database(futurePath);
    futureDb.pragma("user_version = 9999");
    futureDb.close();

    const res = await request(app)
      .post("/storage/restore")
      .attach("file", futurePath);

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: "Backup was written by a newer version of Horizon",
    });
  });
});

describe("POST /storage/restore — Mongo driver (stubbed)", () => {
  let app: Express;
  let tmpDir: string;
  let dummyPath: string;

  beforeEach(async () => {
    process.env.AUTH_DISABLED = "1";
    app = await createApp(createMongoStorageStub());
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "horizon-restore-mongo-"));
    dummyPath = path.join(tmpDir, "dummy.db");
    fs.writeFileSync(dummyPath, Buffer.from("dummy"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("returns 400 when the driver does not support restore", async () => {
    const res = await request(app)
      .post("/storage/restore")
      .attach("file", dummyPath);
    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: "Storage driver does not support restore",
    });
  });
});

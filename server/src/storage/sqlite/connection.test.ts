import { afterEach, beforeEach, describe, expect, it } from "vitest";
import Database from "better-sqlite3";
import fs from "fs";
import os from "os";
import path from "path";
import { openConnection, closeConnection } from "./connection.js";
import { migrate } from "./migrate.js";
import { StorageIntegrityError } from "./errors.js";
import { createSqliteStorage } from "./SqliteStorage.js";

function makeTempDbPath(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "horizon-conn-"));
  return path.join(dir, "horizon.db");
}

function sidecarsFor(dbPath: string): { wal: string; shm: string } {
  return { wal: `${dbPath}-wal`, shm: `${dbPath}-shm` };
}

function cleanupTempDir(dbPath: string): void {
  const dir = path.dirname(dbPath);
  fs.rmSync(dir, { recursive: true, force: true });
}

describe("connection (SQLite)", () => {
  let dbPath: string;

  beforeEach(() => {
    dbPath = makeTempDbPath();
  });

  afterEach(() => {
    cleanupTempDir(dbPath);
  });

  describe("openConnection", () => {
    it("returns a usable handle that can read and write", () => {
      const db = openConnection(dbPath);

      db.prepare(
        `INSERT INTO categories (id, name, is_default) VALUES (?, ?, 0)`
      ).run("11111111-1111-4111-8111-111111111111", "Vet");

      const row = db
        .prepare(`SELECT name FROM categories WHERE id = ?`)
        .get("11111111-1111-4111-8111-111111111111") as
        | { name: string }
        | undefined;

      expect(row?.name).toBe("Vet");

      closeConnection(db);
    });
  });

  describe("migrate (in isolation)", () => {
    it("does NOT touch the foreign_keys pragma — that lives in connection.ts now", () => {
      // The "schema-only" guarantee: migrate must not alter connection-state
      // pragmas. If we turn foreign_keys OFF before migrate runs, it must
      // still be OFF after. Pragma introspection is the only way to observe
      // the absence of a state change.
      const db = new Database(":memory:");
      db.pragma("foreign_keys = OFF");
      expect(db.pragma("foreign_keys", { simple: true })).toBe(0);

      migrate(db);

      expect(db.pragma("foreign_keys", { simple: true })).toBe(0);
      db.close();
    });
  });

  describe("closeConnection", () => {
    it("is idempotent — a second call is a safe no-op", () => {
      const db = openConnection(dbPath);

      closeConnection(db);
      expect(() => closeConnection(db)).not.toThrow();
    });

    it("leaves no -wal / -shm sidecar files on disk after a clean close", () => {
      const db = openConnection(dbPath);

      db.prepare(
        `INSERT INTO categories (id, name, is_default) VALUES (?, ?, 0)`
      ).run("33333333-3333-4333-8333-333333333333", "Tools");

      closeConnection(db);

      const { wal, shm } = sidecarsFor(dbPath);
      expect(fs.existsSync(dbPath)).toBe(true);
      expect(fs.existsSync(wal)).toBe(false);
      expect(fs.existsSync(shm)).toBe(false);
    });
  });

  describe("tempfile durability", () => {
    it("survives a full open → write → close → reopen cycle", () => {
      const first = openConnection(dbPath);
      first
        .prepare(
          `INSERT INTO categories (id, name, is_default) VALUES (?, ?, 0)`
        )
        .run("44444444-4444-4444-8444-444444444444", "Pets");
      closeConnection(first);

      const second = openConnection(dbPath);
      const row = second
        .prepare(`SELECT name FROM categories WHERE id = ?`)
        .get("44444444-4444-4444-8444-444444444444") as
        | { name: string }
        | undefined;

      expect(row?.name).toBe("Pets");

      closeConnection(second);
    });
  });

  describe("openConnection — integrity", () => {
    it("StorageIntegrityError is exported and is an instance of Error", () => {
      const err = new StorageIntegrityError("anything");
      expect(err).toBeInstanceOf(Error);
      expect(err).toBeInstanceOf(StorageIntegrityError);
      expect(err.message).toBe("anything");
    });

    it("throws StorageIntegrityError on a corrupted tempfile, with detail in message", () => {
      // Seed a real, healthy DB so the file has a valid SQLite header and at
      // least a couple of pages of schema/data on disk.
      const seed = openConnection(dbPath);
      seed
        .prepare(
          `INSERT INTO categories (id, name, is_default) VALUES (?, ?, 0)`
        )
        .run("55555555-5555-4555-8555-555555555555", "Seed");
      closeConnection(seed);

      // Corrupt bytes inside the B-tree cell area of page 1 (well past the
      // 100-byte SQLite header). This trips PRAGMA integrity_check while
      // leaving the header intact enough to open the file.
      const buf = fs.readFileSync(dbPath);
      for (let i = 2000; i < 3000 && i < buf.length; i++) {
        buf[i] = 0xff;
      }
      fs.writeFileSync(dbPath, buf);

      let caught: unknown = null;
      try {
        openConnection(dbPath);
      } catch (e) {
        caught = e;
      }

      expect(caught).toBeInstanceOf(StorageIntegrityError);
      const message = (caught as Error).message;
      expect(message.length).toBeGreaterThan(0);
      // The integrity-check detail must be surfaced (not just "corrupted"),
      // so the Electron shell can show the real SQLite message to the user.
      expect(message).not.toBe("ok");
    });

    it("throws StorageIntegrityError on a future user_version", () => {
      // A file whose user_version is higher than the latest known migration
      // came from a newer build. Migrate cannot advance it; opening it would
      // run on an unknown schema. Refuse loudly.
      const db = new Database(dbPath);
      db.pragma("user_version = 9999");
      db.close();

      expect(() => openConnection(dbPath)).toThrow(StorageIntegrityError);
    });
  });

  describe("SqliteStorage integration", () => {
    it("Storage.close() leaves no -wal / -shm sidecar files on disk", async () => {
      const storage = await createSqliteStorage(dbPath);

      const account = await storage.accounts.create({
        kind: "Girokonto",
        name: "Main",
        openingBalance: 100000,
        openingDate: "2026-05-01",
      });
      await storage.transactions.create(account.id, {
        date: "2026-05-02",
        amount: -1500,
        description: "Coffee",
        category: "Food",
      });

      await storage.close();

      const { wal, shm } = sidecarsFor(dbPath);
      expect(fs.existsSync(dbPath)).toBe(true);
      expect(fs.existsSync(wal)).toBe(false);
      expect(fs.existsSync(shm)).toBe(false);
    });
  });
});

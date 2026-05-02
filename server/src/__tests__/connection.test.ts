import { afterEach, beforeEach, describe, expect, it } from "vitest";
import Database from "better-sqlite3";
import fs from "fs";
import os from "os";
import path from "path";
import {
  openConnection,
  closeConnection,
} from "../storage/sqlite/connection.js";
import { migrate } from "../storage/sqlite/migrate.js";
import { createSqliteStorage } from "../storage/sqlite/SqliteStorage.js";

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
    it("does NOT enable foreign_keys — that pragma now lives in connection.ts", async () => {
      // A bare better-sqlite3 Database with only migrate() applied should not
      // enforce FKs. Inserting a transactions row whose account_id points to a
      // non-existent account must succeed when FKs are off.
      const db = new Database(":memory:");
      await migrate(db);

      const insert = db.prepare(
        `INSERT INTO transactions (id, account_id, date, amount, description, category)
         VALUES (?, ?, ?, ?, ?, ?)`
      );

      expect(() =>
        insert.run(
          "22222222-2222-4222-8222-222222222222",
          "00000000-0000-4000-8000-999999999999",
          "2026-05-01",
          -100,
          "orphan",
          "Food"
        )
      ).not.toThrow();

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

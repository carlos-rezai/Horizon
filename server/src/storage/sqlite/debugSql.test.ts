import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createSqliteStorage } from "./SqliteStorage.js";
import {
  openConnection,
  closeConnection,
} from "../storage/sqlite/connection.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SQLITE_DIR = path.resolve(__dirname, "../storage/sqlite");

describe("DEBUG_SQL query tracing switch (issue #58)", () => {
  describe("createSqliteStorage — verbose option", () => {
    it("forwards every executed SQL statement to the verbose callback", async () => {
      const seen: string[] = [];
      const verbose = (sql: string) => {
        seen.push(sql);
      };

      const storage = await createSqliteStorage(":memory:", { verbose });

      // Execute a real domain operation so SQL is actually issued by repos.
      const account = await storage.accounts.create({
        kind: "Girokonto",
        name: "Trace Me",
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

      // The verbose callback must have received SQL strings — at minimum the
      // INSERTs for the account and the transaction.
      expect(seen.length).toBeGreaterThan(0);
      const joined = seen.join("\n").toLowerCase();
      expect(joined).toContain("insert");
      expect(joined).toContain("accounts");
      expect(joined).toContain("transactions");
    });

    it("forwards SQL to verbose at the openConnection layer too", () => {
      const seen: string[] = [];
      const db = openConnection(":memory:", {
        verbose: (sql) => seen.push(sql),
      });

      db.prepare(
        `INSERT INTO categories (id, name, is_default) VALUES (?, ?, 0)`
      ).run("11111111-1111-4111-8111-111111111111", "Vet");

      closeConnection(db);

      expect(seen.length).toBeGreaterThan(0);
      expect(seen.some((s) => /insert\s+into\s+categories/i.test(s))).toBe(
        true
      );
    });
  });

  describe("createSqliteStorage — no verbose option", () => {
    let logSpy: ReturnType<typeof vi.spyOn>;
    let infoSpy: ReturnType<typeof vi.spyOn>;
    let warnSpy: ReturnType<typeof vi.spyOn>;
    let errorSpy: ReturnType<typeof vi.spyOn>;
    let debugSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
      warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {});
    });

    afterEach(() => {
      logSpy.mockRestore();
      infoSpy.mockRestore();
      warnSpy.mockRestore();
      errorSpy.mockRestore();
      debugSpy.mockRestore();
    });

    it("emits no logs through any console channel during normal use", async () => {
      const storage = await createSqliteStorage(":memory:");

      const account = await storage.accounts.create({
        kind: "Girokonto",
        name: "Quiet",
        openingBalance: 50000,
        openingDate: "2026-05-01",
      });
      await storage.transactions.create(account.id, {
        date: "2026-05-02",
        amount: -1000,
        description: "Tea",
        category: "Food",
      });
      await storage.accounts.findAllWithBalance();

      await storage.close();

      expect(logSpy).not.toHaveBeenCalled();
      expect(infoSpy).not.toHaveBeenCalled();
      expect(warnSpy).not.toHaveBeenCalled();
      expect(errorSpy).not.toHaveBeenCalled();
      expect(debugSpy).not.toHaveBeenCalled();
    });
  });

  describe("static guard — sqlite/ never reads process.env", () => {
    it("no file under server/src/storage/sqlite/ references process.env", () => {
      const offenders: string[] = [];

      const walk = (dir: string): void => {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          const full = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            walk(full);
            continue;
          }
          if (!/\.(ts|js|mjs|cjs)$/.test(entry.name)) continue;
          const contents = fs.readFileSync(full, "utf8");
          if (/process\s*\.\s*env/.test(contents)) {
            offenders.push(full);
          }
        }
      };

      walk(SQLITE_DIR);

      expect(offenders).toEqual([]);
    });
  });
});

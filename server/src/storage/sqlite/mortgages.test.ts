import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createSqliteStorage } from "./SqliteStorage.js";
import type { Storage } from "../Storage.js";
import type { MortgageSetup } from "../types.js";

// A file-backed database, so a second connection can install a trigger that
// makes the origination write fail — the only way to observe from outside
// that the account and its origination are written in one transaction.
let tmpDir: string;
let dbPath: string;
let storage: Storage;

beforeEach(async () => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "horizon-mortgages-"));
  dbPath = path.join(tmpDir, "horizon.db");
  storage = await createSqliteStorage(dbPath);
});

afterEach(async () => {
  await storage.close();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

const setup: MortgageSetup = {
  name: "Haus",
  openingBalance: 20000000,
  openingDate: "2026-10-16",
  originalPrincipal: 40000000,
  startDate: "2020-06-01",
  termYears: 25,
};

/** The principal the trigger refuses to store — on insert or on update. */
const POISONED_PRINCIPAL = 99999999;

function failOriginationWrites(): void {
  const side = new Database(dbPath);
  side.exec(`
    CREATE TRIGGER fail_origination_insert BEFORE INSERT ON accounts
    WHEN NEW.original_principal = ${POISONED_PRINCIPAL}
    BEGIN SELECT RAISE(ABORT, 'origination write failed'); END;

    CREATE TRIGGER fail_origination_update BEFORE UPDATE ON accounts
    WHEN NEW.original_principal = ${POISONED_PRINCIPAL}
    BEGIN SELECT RAISE(ABORT, 'origination write failed'); END;
  `);
  side.close();
}

describe("SQLite mortgages.create", () => {
  it("creates the Mortgage account with its origination and answers it with its balance", async () => {
    const created = await storage.mortgages.create(setup);

    expect(created.kind).toBe("Mortgage");
    expect(created.name).toBe("Haus");
    expect(created.balance).toBe(20000000);
    expect(created.originalPrincipal).toBe(40000000);
    expect(created.startDate).toBe("2020-06-01");
    expect(created.termYears).toBe(25);

    const stored = await storage.accounts.findByIdWithBalance(created.id);
    expect(stored?.originalPrincipal).toBe(40000000);
    expect(stored?.termYears).toBe(25);
  });

  it("gives the account no icon", async () => {
    const created = await storage.mortgages.create(setup);

    expect(created.icon ?? null).toBeNull();
  });

  it("writes the account and its origination in one transaction: a failing origination write leaves no account", async () => {
    const mortgages = storage.mortgages;
    failOriginationWrites();

    await expect(
      mortgages.create({ ...setup, originalPrincipal: POISONED_PRINCIPAL })
    ).rejects.toThrow(/origination write failed/);

    const accounts = await storage.accounts.findAll();
    expect(accounts.filter((a) => a.name === "Haus")).toHaveLength(0);
  });
});

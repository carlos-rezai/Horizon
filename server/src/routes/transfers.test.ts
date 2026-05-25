import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { createSqliteAppHandle } from "../testing/sqliteApp.js";

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
// Helpers
// ---------------------------------------------------------------------------

async function createAccount(
  kind = "Girokonto",
  name = "Main",
  openingBalance = 500000
) {
  const res = await request(app).post("/accounts").send({
    kind,
    name,
    openingBalance,
    openingDate: "2026-01-01",
  });
  return res.body as { id: string; balance: number };
}

async function postTransfer(
  fromAccountId: string,
  toAccountId: string,
  amount: number
) {
  return request(app).post("/transfers").send({
    fromAccountId,
    toAccountId,
    amount,
    date: "2026-03-01",
    description: "Tagesgeld transfer",
    category: "Transfer",
  });
}

// ---------------------------------------------------------------------------
// POST /transfers
// ---------------------------------------------------------------------------

describe("POST /transfers", () => {
  it("creates two transaction legs sharing the same transferId", async () => {
    const source = await createAccount("Girokonto", "Main", 500000);
    const dest = await createAccount("Tagesgeld", "Savings", 0);

    const res = await postTransfer(source.id, dest.id, 70000);

    expect(res.status).toBe(201);
    expect(res.body.transferId).toBeDefined();

    const sourceTxs = await request(app).get(
      `/accounts/${source.id}/transactions`
    );
    const destTxs = await request(app).get(`/accounts/${dest.id}/transactions`);

    expect(sourceTxs.body).toHaveLength(1);
    expect(destTxs.body).toHaveLength(1);
    expect(sourceTxs.body[0].transferId).toBe(res.body.transferId);
    expect(destTxs.body[0].transferId).toBe(res.body.transferId);
  });

  it("creates a debit on source and a credit on destination", async () => {
    const source = await createAccount("Girokonto", "Main", 500000);
    const dest = await createAccount("Tagesgeld", "Savings", 0);

    await postTransfer(source.id, dest.id, 70000);

    const sourceTxs = await request(app).get(
      `/accounts/${source.id}/transactions`
    );
    const destTxs = await request(app).get(`/accounts/${dest.id}/transactions`);

    expect(sourceTxs.body[0].amount).toBe(-70000);
    expect(destTxs.body[0].amount).toBe(70000);
  });

  it("decreases the source account balance by the transfer amount", async () => {
    const source = await createAccount("Girokonto", "Main", 500000);
    const dest = await createAccount("Tagesgeld", "Savings", 0);

    await postTransfer(source.id, dest.id, 70000);

    const res = await request(app).get(`/accounts/${source.id}`);
    expect(res.body.balance).toBe(430000);
  });

  it("increases the destination account balance by the transfer amount", async () => {
    const source = await createAccount("Girokonto", "Main", 500000);
    const dest = await createAccount("Tagesgeld", "Savings", 0);

    await postTransfer(source.id, dest.id, 70000);

    const res = await request(app).get(`/accounts/${dest.id}`);
    expect(res.body.balance).toBe(70000);
  });

  it("returns 404 when the source account does not exist", async () => {
    const dest = await createAccount("Tagesgeld", "Savings", 0);

    const res = await postTransfer("000000000000000000000000", dest.id, 70000);

    expect(res.status).toBe(404);
  });

  it("returns 404 when the destination account does not exist", async () => {
    const source = await createAccount("Girokonto", "Main", 500000);

    const res = await postTransfer(
      source.id,
      "000000000000000000000000",
      70000
    );

    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// transferId visible in transaction lists
// ---------------------------------------------------------------------------

describe("transferId on transaction legs", () => {
  it("is present on both legs in GET /accounts/:id/transactions", async () => {
    const source = await createAccount("Girokonto", "Main", 500000);
    const dest = await createAccount("Tagesgeld", "Savings", 0);

    const transfer = await postTransfer(source.id, dest.id, 70000);

    const sourceTxs = await request(app).get(
      `/accounts/${source.id}/transactions`
    );
    const destTxs = await request(app).get(`/accounts/${dest.id}/transactions`);

    expect(sourceTxs.body[0].transferId).toBe(transfer.body.transferId);
    expect(destTxs.body[0].transferId).toBe(transfer.body.transferId);
  });
});

// ---------------------------------------------------------------------------
// DELETE /transfers/:transferId
// ---------------------------------------------------------------------------

describe("DELETE /transfers/:transferId", () => {
  it("removes both transaction legs", async () => {
    const source = await createAccount("Girokonto", "Main", 500000);
    const dest = await createAccount("Tagesgeld", "Savings", 0);

    const transfer = await postTransfer(source.id, dest.id, 70000);

    const res = await request(app).delete(
      `/transfers/${transfer.body.transferId}`
    );

    expect(res.status).toBe(204);

    const sourceTxs = await request(app).get(
      `/accounts/${source.id}/transactions`
    );
    const destTxs = await request(app).get(`/accounts/${dest.id}/transactions`);

    expect(sourceTxs.body).toHaveLength(0);
    expect(destTxs.body).toHaveLength(0);
  });

  it("restores both account balances after deletion", async () => {
    const source = await createAccount("Girokonto", "Main", 500000);
    const dest = await createAccount("Tagesgeld", "Savings", 0);

    const transfer = await postTransfer(source.id, dest.id, 70000);
    await request(app).delete(`/transfers/${transfer.body.transferId}`);

    const sourceRes = await request(app).get(`/accounts/${source.id}`);
    const destRes = await request(app).get(`/accounts/${dest.id}`);

    expect(sourceRes.body.balance).toBe(500000);
    expect(destRes.body.balance).toBe(0);
  });

  it("returns 404 for an unknown transferId", async () => {
    const res = await request(app).delete("/transfers/nonexistent-transfer-id");

    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// Guard: direct leg deletion is blocked
// ---------------------------------------------------------------------------

describe("DELETE /transactions/:id on a transfer leg", () => {
  it("returns 409 — direct deletion of a transfer leg is blocked", async () => {
    const source = await createAccount("Girokonto", "Main", 500000);
    const dest = await createAccount("Tagesgeld", "Savings", 0);

    await postTransfer(source.id, dest.id, 70000);

    const sourceTxs = await request(app).get(
      `/accounts/${source.id}/transactions`
    );
    const legId = sourceTxs.body[0].id;

    const res = await request(app).delete(`/transactions/${legId}`);

    expect(res.status).toBe(409);
  });
});

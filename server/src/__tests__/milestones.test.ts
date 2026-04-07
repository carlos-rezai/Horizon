import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";
import { createApp } from "../app.js";
import type { Express } from "express";

let mongod: MongoMemoryServer;
let app: Express;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  app = await createApp(mongod.getUri());
});

afterAll(async () => {
  await mongod.stop();
});

afterEach(async () => {
  const { connection } = await import("mongoose");
  const collections = await connection.db?.collections();
  if (collections) {
    for (const collection of collections) {
      await collection.deleteMany({});
    }
  }
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function createAccount() {
  const res = await request(app).post("/accounts").send({
    kind: "Tagesgeld",
    name: "Reserve",
    openingBalance: 500000,
    openingDate: "2026-01-01",
  });
  return res.body as { _id: string };
}

// ---------------------------------------------------------------------------
// POST /milestones
// ---------------------------------------------------------------------------

describe("POST /milestones", () => {
  it("creates a milestone and returns 201 with the record", async () => {
    const account = await createAccount();

    const res = await request(app).post("/milestones").send({
      name: "Emergency fund",
      accountId: account._id,
      targetBalance: 600000,
    });

    expect(res.status).toBe(201);
    expect(res.body._id).toBeDefined();
    expect(res.body.name).toBe("Emergency fund");
    expect(res.body.accountId).toBe(account._id);
    expect(res.body.targetBalance).toBe(600000);
  });

  it("returns 400 when name is missing", async () => {
    const account = await createAccount();

    const res = await request(app).post("/milestones").send({
      accountId: account._id,
      targetBalance: 600000,
    });

    expect(res.status).toBe(400);
  });

  it("returns 400 when accountId is missing", async () => {
    const res = await request(app).post("/milestones").send({
      name: "Emergency fund",
      targetBalance: 600000,
    });

    expect(res.status).toBe(400);
  });

  it("returns 400 when targetBalance is missing", async () => {
    const account = await createAccount();

    const res = await request(app).post("/milestones").send({
      name: "Emergency fund",
      accountId: account._id,
    });

    expect(res.status).toBe(400);
  });

  it("returns 404 when accountId does not reference a real account", async () => {
    const res = await request(app).post("/milestones").send({
      name: "Emergency fund",
      accountId: "000000000000000000000000",
      targetBalance: 600000,
    });

    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// GET /milestones
// ---------------------------------------------------------------------------

describe("GET /milestones", () => {
  it("returns empty array when no milestones exist", async () => {
    const res = await request(app).get("/milestones");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("returns all milestones", async () => {
    const account = await createAccount();

    await request(app).post("/milestones").send({
      name: "Emergency fund",
      accountId: account._id,
      targetBalance: 600000,
    });
    await request(app).post("/milestones").send({
      name: "House deposit",
      accountId: account._id,
      targetBalance: 2000000,
    });

    const res = await request(app).get("/milestones");

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    const names = res.body.map((m: { name: string }) => m.name);
    expect(names).toContain("Emergency fund");
    expect(names).toContain("House deposit");
  });
});

// ---------------------------------------------------------------------------
// DELETE /milestones/:id
// ---------------------------------------------------------------------------

describe("DELETE /milestones/:id", () => {
  it("returns 204 and removes the milestone", async () => {
    const account = await createAccount();

    const created = await request(app).post("/milestones").send({
      name: "Emergency fund",
      accountId: account._id,
      targetBalance: 600000,
    });

    const res = await request(app).delete(`/milestones/${created.body._id}`);
    expect(res.status).toBe(204);

    const list = await request(app).get("/milestones");
    expect(list.body).toHaveLength(0);
  });

  it("returns 404 for an unknown id", async () => {
    const res = await request(app).delete(
      "/milestones/000000000000000000000000"
    );

    expect(res.status).toBe(404);
  });
});

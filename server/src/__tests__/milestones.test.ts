import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { createSqliteAppHandle } from "./helpers/sqliteApp.js";

let app: Express;
let cleanup: () => Promise<void>;

beforeAll(async () => {
  const handle = await createSqliteAppHandle();
  app = handle.app;
  cleanup = handle.cleanup;
});

afterAll(async () => {
  await cleanup();
});

// Milestone routes were removed in the UI redesign (issue #79).
// All three endpoints must return 404.

describe("GET /milestones — route removed", () => {
  it("returns 404", async () => {
    const res = await request(app).get("/milestones");
    expect(res.status).toBe(404);
  });
});

describe("POST /milestones — route removed", () => {
  it("returns 404", async () => {
    const res = await request(app).post("/milestones").send({
      name: "Emergency fund",
      accountId: "any-id",
      targetBalance: 600000,
    });
    expect(res.status).toBe(404);
  });
});

describe("DELETE /milestones/:id — route removed", () => {
  it("returns 404", async () => {
    const res = await request(app).delete("/milestones/some-id");
    expect(res.status).toBe(404);
  });
});

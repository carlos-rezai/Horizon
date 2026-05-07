import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import type { Express } from "express";

const verifyIdTokenMock = vi.fn();

vi.mock("google-auth-library", () => ({
  OAuth2Client: vi.fn().mockImplementation(() => ({
    verifyIdToken: verifyIdTokenMock,
  })),
}));

const ORIGINAL_ENV = { ...process.env };
const OWNER_SUB = "owner-sub-cloud-hardening";

interface AppHandle {
  app: Express;
  cleanup: () => Promise<void>;
}

async function buildApp(
  env: Record<string, string | undefined>
): Promise<AppHandle> {
  for (const [k, v] of Object.entries(env)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  const { createApp } = await import("../app.js");
  const { createStorage } = await import("../storage/index.js");
  const storage = await createStorage({ path: ":memory:" });
  const app = await createApp(storage);
  return {
    app,
    cleanup: async () => {
      await storage.close();
    },
  };
}

beforeEach(() => {
  verifyIdTokenMock.mockReset();
  process.env.OWNER_GOOGLE_SUB = OWNER_SUB;
  process.env.GOOGLE_CLIENT_ID = "test-client-id";
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

// ---------------------------------------------------------------------------
// AUTH_DISABLED toggles the entire cloud-only middleware stack
// ---------------------------------------------------------------------------

describe("AUTH_DISABLED toggles the cloud-only middleware stack", () => {
  it("Cloud (AUTH_DISABLED unset) rejects unauthenticated /accounts; Desktop (AUTH_DISABLED=1) serves it", async () => {
    const cloud = await buildApp({
      AUTH_DISABLED: undefined,
      OWNER_GOOGLE_SUB: OWNER_SUB,
      GOOGLE_CLIENT_ID: "test-client-id",
    });
    const cloudRes = await request(cloud.app).get("/accounts");
    expect(cloudRes.status).toBe(401);
    await cloud.cleanup();

    const desktop = await buildApp({
      AUTH_DISABLED: "1",
      OWNER_GOOGLE_SUB: OWNER_SUB,
      GOOGLE_CLIENT_ID: "test-client-id",
    });
    const desktopRes = await request(desktop.app).get("/accounts");
    expect(desktopRes.status).toBe(200);
    await desktop.cleanup();
  });

  it("Cloud invokes verifyIdToken on incoming requests; Desktop never does", async () => {
    verifyIdTokenMock.mockResolvedValue({
      getPayload: () => ({ sub: OWNER_SUB }),
    });

    const cloud = await buildApp({
      AUTH_DISABLED: undefined,
      OWNER_GOOGLE_SUB: OWNER_SUB,
      GOOGLE_CLIENT_ID: "test-client-id",
    });
    await request(cloud.app)
      .get("/accounts")
      .set("Authorization", "Bearer some.token");
    expect(verifyIdTokenMock).toHaveBeenCalled();
    await cloud.cleanup();

    verifyIdTokenMock.mockClear();

    const desktop = await buildApp({
      AUTH_DISABLED: "1",
      OWNER_GOOGLE_SUB: OWNER_SUB,
      GOOGLE_CLIENT_ID: "test-client-id",
    });
    await request(desktop.app)
      .get("/accounts")
      .set("Authorization", "Bearer some.token");
    expect(verifyIdTokenMock).not.toHaveBeenCalled();
    await desktop.cleanup();
  });

  it("Cloud sets the helmet x-content-type-options: nosniff header; Desktop does not", async () => {
    verifyIdTokenMock.mockResolvedValue({
      getPayload: () => ({ sub: OWNER_SUB }),
    });

    const cloud = await buildApp({
      AUTH_DISABLED: undefined,
      OWNER_GOOGLE_SUB: OWNER_SUB,
      GOOGLE_CLIENT_ID: "test-client-id",
    });
    const cloudRes = await request(cloud.app)
      .get("/accounts")
      .set("Authorization", "Bearer valid.token");
    expect(cloudRes.headers["x-content-type-options"]).toBe("nosniff");
    await cloud.cleanup();

    const desktop = await buildApp({
      AUTH_DISABLED: "1",
      OWNER_GOOGLE_SUB: OWNER_SUB,
      GOOGLE_CLIENT_ID: "test-client-id",
    });
    const desktopRes = await request(desktop.app).get("/accounts");
    expect(desktopRes.headers["x-content-type-options"]).toBeUndefined();
    await desktop.cleanup();
  });
});

// ---------------------------------------------------------------------------
// requireOwner cases at the HTTP boundary (Cloud Build)
// ---------------------------------------------------------------------------

describe("requireOwner at the HTTP boundary (Cloud Build)", () => {
  it("rejects /accounts with 401 when the Bearer token's sub does not match OWNER_GOOGLE_SUB", async () => {
    verifyIdTokenMock.mockResolvedValue({
      getPayload: () => ({ sub: "not-the-owner" }),
    });

    const cloud = await buildApp({
      AUTH_DISABLED: undefined,
      OWNER_GOOGLE_SUB: OWNER_SUB,
      GOOGLE_CLIENT_ID: "test-client-id",
    });
    const res = await request(cloud.app)
      .get("/accounts")
      .set("Authorization", "Bearer wrong.sub.token");
    expect(res.status).toBe(401);
    await cloud.cleanup();
  });

  it("allows /accounts when the Bearer token's sub matches OWNER_GOOGLE_SUB and verifyIdToken was actually consulted", async () => {
    verifyIdTokenMock.mockResolvedValue({
      getPayload: () => ({ sub: OWNER_SUB }),
    });

    const cloud = await buildApp({
      AUTH_DISABLED: undefined,
      OWNER_GOOGLE_SUB: OWNER_SUB,
      GOOGLE_CLIENT_ID: "test-client-id",
    });
    const res = await request(cloud.app)
      .get("/accounts")
      .set("Authorization", "Bearer valid.token");

    expect(res.status).toBe(200);
    expect(verifyIdTokenMock).toHaveBeenCalled();
    await cloud.cleanup();
  });
});

// ---------------------------------------------------------------------------
// Rate limit on the auth-gated path (Cloud Build only)
// ---------------------------------------------------------------------------

describe("Cloud Build rate limit on the auth-gated path", () => {
  it("returns 429 once the configured limit is exceeded", async () => {
    verifyIdTokenMock.mockRejectedValue(new Error("invalid token"));

    const cloud = await buildApp({
      AUTH_DISABLED: undefined,
      OWNER_GOOGLE_SUB: OWNER_SUB,
      GOOGLE_CLIENT_ID: "test-client-id",
      AUTH_RATE_LIMIT_MAX: "3",
      AUTH_RATE_LIMIT_WINDOW_MS: "60000",
    });
    const limit = 3;

    for (let i = 0; i < limit; i++) {
      const r = await request(cloud.app)
        .get("/accounts")
        .set("Authorization", "Bearer brute.force.attempt");
      expect(r.status).toBe(401);
    }

    const blocked = await request(cloud.app)
      .get("/accounts")
      .set("Authorization", "Bearer brute.force.attempt");
    expect(blocked.status).toBe(429);
    await cloud.cleanup();

    const desktop = await buildApp({
      AUTH_DISABLED: "1",
      OWNER_GOOGLE_SUB: OWNER_SUB,
      GOOGLE_CLIENT_ID: "test-client-id",
      AUTH_RATE_LIMIT_MAX: "3",
      AUTH_RATE_LIMIT_WINDOW_MS: "60000",
    });
    for (let i = 0; i < 5; i++) {
      const r = await request(desktop.app).get("/accounts");
      expect(r.status).toBe(200);
    }
    await desktop.cleanup();
  });
});

// ---------------------------------------------------------------------------
// Sanitizing 5xx error handler — Cloud Build only
// ---------------------------------------------------------------------------

describe("Cloud Build sanitizing 5xx error handler", () => {
  it("returns { error: 'Internal server error' } for unhandled 5xx in Cloud, but the same throw in Desktop is not sanitized", async () => {
    verifyIdTokenMock.mockResolvedValue({
      getPayload: () => ({ sub: OWNER_SUB }),
    });

    const cloud = await buildApp({
      AUTH_DISABLED: undefined,
      OWNER_GOOGLE_SUB: OWNER_SUB,
      GOOGLE_CLIENT_ID: "test-client-id",
    });
    cloud.app.get("/__throw", () => {
      throw new Error("totally-secret-stack-detail");
    });

    const cloudRes = await request(cloud.app)
      .get("/__throw")
      .set("Authorization", "Bearer valid.token");

    expect(cloudRes.status).toBe(500);
    expect(cloudRes.body).toEqual({ error: "Internal server error" });
    expect(JSON.stringify(cloudRes.body)).not.toContain(
      "totally-secret-stack-detail"
    );
    expect(cloudRes.text).not.toContain("totally-secret-stack-detail");
    await cloud.cleanup();

    const desktop = await buildApp({
      AUTH_DISABLED: "1",
      OWNER_GOOGLE_SUB: OWNER_SUB,
      GOOGLE_CLIENT_ID: "test-client-id",
    });
    desktop.app.get("/__throw", () => {
      throw new Error("desktop-error-detail");
    });

    const desktopRes = await request(desktop.app).get("/__throw");

    expect(desktopRes.status).toBe(500);
    expect(desktopRes.body).not.toEqual({ error: "Internal server error" });
    await desktop.cleanup();
  });

  it("leaves 4xx error strings unchanged on Cloud (sanitizer is 5xx-only)", async () => {
    verifyIdTokenMock.mockResolvedValue({
      getPayload: () => ({ sub: OWNER_SUB }),
    });

    const cloud = await buildApp({
      AUTH_DISABLED: undefined,
      OWNER_GOOGLE_SUB: OWNER_SUB,
      GOOGLE_CLIENT_ID: "test-client-id",
    });
    cloud.app.get("/__bad-request", (_req, res) => {
      res.status(400).json({ error: "specific-validation-message" });
    });

    const res = await request(cloud.app)
      .get("/__bad-request")
      .set("Authorization", "Bearer valid.token");

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "specific-validation-message" });
    expect(verifyIdTokenMock).toHaveBeenCalled();
    await cloud.cleanup();
  });
});

// ---------------------------------------------------------------------------
// OWNER_GOOGLE_SUB rotation — env value at startup is honoured, no code change
// ---------------------------------------------------------------------------

describe("OWNER_GOOGLE_SUB rotation", () => {
  it("a token whose sub matched the previous OWNER_GOOGLE_SUB is rejected after the env is rotated and the app re-created", async () => {
    verifyIdTokenMock.mockResolvedValue({
      getPayload: () => ({ sub: "old-owner-sub" }),
    });

    const before = await buildApp({
      AUTH_DISABLED: undefined,
      OWNER_GOOGLE_SUB: "old-owner-sub",
      GOOGLE_CLIENT_ID: "test-client-id",
    });
    const allowed = await request(before.app)
      .get("/accounts")
      .set("Authorization", "Bearer old.token");
    expect(allowed.status).toBe(200);
    await before.cleanup();

    const after = await buildApp({
      AUTH_DISABLED: undefined,
      OWNER_GOOGLE_SUB: "new-owner-sub",
      GOOGLE_CLIENT_ID: "test-client-id",
    });
    const denied = await request(after.app)
      .get("/accounts")
      .set("Authorization", "Bearer old.token");
    expect(denied.status).toBe(401);
    await after.cleanup();
  });
});

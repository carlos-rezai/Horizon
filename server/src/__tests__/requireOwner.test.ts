import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Request, Response, NextFunction } from "express";

const verifyIdTokenMock = vi.fn();

vi.mock("google-auth-library", () => ({
  OAuth2Client: vi.fn().mockImplementation(() => ({
    verifyIdToken: verifyIdTokenMock,
  })),
}));

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  verifyIdTokenMock.mockReset();
  process.env.OWNER_GOOGLE_SUB = "owner-sub-123";
  process.env.GOOGLE_CLIENT_ID = "test-client-id";
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

interface MockRes {
  status: ReturnType<typeof vi.fn>;
  json: ReturnType<typeof vi.fn>;
  statusCode: number;
  body: unknown;
}

function makeRes(): MockRes {
  const res: MockRes = {
    statusCode: 0,
    body: undefined,
    status: vi.fn(),
    json: vi.fn(),
  };
  res.status.mockImplementation((code: number) => {
    res.statusCode = code;
    return res;
  });
  res.json.mockImplementation((body: unknown) => {
    res.body = body;
    return res;
  });
  return res;
}

function makeReq(headers: Record<string, string> = {}): Request {
  return { headers } as unknown as Request;
}

async function loadRequireOwner(): Promise<
  (req: Request, res: Response, next: NextFunction) => Promise<void> | void
> {
  const mod = await import("../auth/requireOwner.js");
  return mod.requireOwner;
}

describe("requireOwner", () => {
  it("calls next() and writes no response when token is valid and sub matches", async () => {
    verifyIdTokenMock.mockResolvedValue({
      getPayload: () => ({ sub: "owner-sub-123" }),
    });

    const requireOwner = await loadRequireOwner();
    const req = makeReq({ authorization: "Bearer good.token.here" });
    const res = makeRes();
    const next = vi.fn();

    await requireOwner(req, res as unknown as Response, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });

  it("rejects with 401 when token is valid but sub does not match the Owner allowlist", async () => {
    verifyIdTokenMock.mockResolvedValue({
      getPayload: () => ({ sub: "some-other-google-sub" }),
    });

    const requireOwner = await loadRequireOwner();
    const req = makeReq({ authorization: "Bearer good.token.wrong-sub" });
    const res = makeRes();
    const next = vi.fn();

    await requireOwner(req, res as unknown as Response, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
  });

  it("rejects with 401 when the token is expired (verifyIdToken throws)", async () => {
    verifyIdTokenMock.mockRejectedValue(new Error("Token used too late"));

    const requireOwner = await loadRequireOwner();
    const req = makeReq({ authorization: "Bearer expired.token" });
    const res = makeRes();
    const next = vi.fn();

    await requireOwner(req, res as unknown as Response, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
  });

  it("rejects with 401 when the Authorization header is missing", async () => {
    const requireOwner = await loadRequireOwner();
    const req = makeReq({});
    const res = makeRes();
    const next = vi.fn();

    await requireOwner(req, res as unknown as Response, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
    expect(verifyIdTokenMock).not.toHaveBeenCalled();
  });

  it("rejects with 401 when the Authorization header uses the wrong scheme", async () => {
    const requireOwner = await loadRequireOwner();
    const req = makeReq({ authorization: "Basic dXNlcjpwYXNz" });
    const res = makeRes();
    const next = vi.fn();

    await requireOwner(req, res as unknown as Response, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
    expect(verifyIdTokenMock).not.toHaveBeenCalled();
  });

  it("rejects with 401 when the Bearer scheme has no token after it", async () => {
    const requireOwner = await loadRequireOwner();
    const req = makeReq({ authorization: "Bearer " });
    const res = makeRes();
    const next = vi.fn();

    await requireOwner(req, res as unknown as Response, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
    expect(verifyIdTokenMock).not.toHaveBeenCalled();
  });

  it("rejects with 401 when verifyIdToken returns no payload", async () => {
    verifyIdTokenMock.mockResolvedValue({
      getPayload: () => undefined,
    });

    const requireOwner = await loadRequireOwner();
    const req = makeReq({ authorization: "Bearer empty.payload.token" });
    const res = makeRes();
    const next = vi.fn();

    await requireOwner(req, res as unknown as Response, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
  });
});

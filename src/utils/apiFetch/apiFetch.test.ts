// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

interface TokenStoreModule {
  getToken: () => string | null;
  setToken: (token: string) => void;
  clearToken: () => void;
}

interface ApiFetchModule {
  apiFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
  setSilentRefresh: (refresh: (() => Promise<void>) | null) => void;
}

async function loadTokenStore(): Promise<TokenStoreModule> {
  return (await import("../../auth/tokenStore")) as TokenStoreModule;
}

async function loadApiFetch(): Promise<ApiFetchModule> {
  return (await import("./apiFetch")) as ApiFetchModule;
}

const originalFetch = globalThis.fetch;

function makeResponse(status: number, body: unknown = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function getAuthHeader(init: RequestInit | undefined): string | undefined {
  if (!init?.headers) return undefined;
  const h = init.headers;
  if (h instanceof Headers) return h.get("Authorization") ?? undefined;
  if (Array.isArray(h)) {
    const found = h.find(
      ([k]) => typeof k === "string" && k.toLowerCase() === "authorization"
    );
    return found?.[1];
  }
  const record = h as Record<string, string>;
  return record["Authorization"] ?? record["authorization"];
}

describe("apiFetch", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    const { clearToken } = await loadTokenStore();
    const { setSilentRefresh } = await loadApiFetch();
    clearToken();
    setSilentRefresh(null);
    fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(async () => {
    const { clearToken } = await loadTokenStore();
    const { setSilentRefresh } = await loadApiFetch();
    clearToken();
    setSilentRefresh(null);
    globalThis.fetch = originalFetch;
  });

  it("attaches Authorization: Bearer <token> when the token store has a token", async () => {
    const { setToken } = await loadTokenStore();
    const { apiFetch } = await loadApiFetch();
    setToken("id-token-abc");
    fetchMock.mockResolvedValueOnce(makeResponse(200, { ok: true }));

    await apiFetch("https://api.example.com/accounts");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0];
    expect(getAuthHeader(init as RequestInit | undefined)).toBe(
      "Bearer id-token-abc"
    );
  });

  it("does not attach an Authorization header when the token store is empty", async () => {
    const { apiFetch } = await loadApiFetch();
    fetchMock.mockResolvedValueOnce(makeResponse(200, { ok: true }));

    await apiFetch("https://api.example.com/accounts");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0];
    expect(getAuthHeader(init as RequestInit | undefined)).toBeUndefined();
  });

  it("preserves caller-supplied headers and method when attaching the bearer header", async () => {
    const { setToken } = await loadTokenStore();
    const { apiFetch } = await loadApiFetch();
    setToken("id-token-abc");
    fetchMock.mockResolvedValueOnce(makeResponse(200, { ok: true }));

    await apiFetch("https://api.example.com/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Main" }),
    });

    const [, init] = fetchMock.mock.calls[0];
    const reqInit = init as RequestInit;
    expect(reqInit.method).toBe("POST");
    expect(getAuthHeader(reqInit)).toBe("Bearer id-token-abc");
    const headers = new Headers(reqInit.headers);
    expect(headers.get("Content-Type")).toBe("application/json");
  });

  it("on 401, calls the registered silent-refresh callback, retries once with the new token, and returns the retry response", async () => {
    const { setToken } = await loadTokenStore();
    const { apiFetch, setSilentRefresh } = await loadApiFetch();
    setToken("expired-token");

    const refresh = vi.fn().mockImplementation(async () => {
      setToken("fresh-token");
    });
    setSilentRefresh(refresh);

    fetchMock
      .mockResolvedValueOnce(makeResponse(401, { error: "expired" }))
      .mockResolvedValueOnce(makeResponse(200, { ok: true }));

    const res = await apiFetch("https://api.example.com/accounts");

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [, secondInit] = fetchMock.mock.calls[1];
    expect(getAuthHeader(secondInit as RequestInit | undefined)).toBe(
      "Bearer fresh-token"
    );
    expect(res.status).toBe(200);
  });

  it("on 401 with no silent-refresh callback registered, propagates the 401 without retrying", async () => {
    const { setToken } = await loadTokenStore();
    const { apiFetch } = await loadApiFetch();
    setToken("expired-token");
    fetchMock.mockResolvedValueOnce(makeResponse(401, { error: "expired" }));

    const res = await apiFetch("https://api.example.com/accounts");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(res.status).toBe(401);
  });

  it("on 401 when silent refresh fails, propagates the original 401 and does not retry a second time", async () => {
    const { setToken } = await loadTokenStore();
    const { apiFetch, setSilentRefresh } = await loadApiFetch();
    setToken("expired-token");
    const refresh = vi.fn().mockRejectedValue(new Error("refresh failed"));
    setSilentRefresh(refresh);

    fetchMock.mockResolvedValueOnce(makeResponse(401, { error: "expired" }));

    const res = await apiFetch("https://api.example.com/accounts");

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(res.status).toBe(401);
  });

  it("does not retry a second 401 — refresh is attempted at most once per call", async () => {
    const { setToken } = await loadTokenStore();
    const { apiFetch, setSilentRefresh } = await loadApiFetch();
    setToken("expired-token");
    const refresh = vi.fn().mockImplementation(async () => {
      setToken("still-bad-token");
    });
    setSilentRefresh(refresh);

    fetchMock
      .mockResolvedValueOnce(makeResponse(401, { error: "expired" }))
      .mockResolvedValueOnce(makeResponse(401, { error: "still expired" }));

    const res = await apiFetch("https://api.example.com/accounts");

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(res.status).toBe(401);
  });
});

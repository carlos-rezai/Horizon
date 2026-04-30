// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

interface TokenStoreModule {
  getToken: () => string | null;
  setToken: (token: string) => void;
  clearToken: () => void;
}

async function loadTokenStore(): Promise<TokenStoreModule> {
  return (await import("./tokenStore")) as TokenStoreModule;
}

describe("tokenStore", () => {
  let localStorageSetSpy: ReturnType<typeof vi.spyOn>;
  let sessionStorageSetSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    const { clearToken } = await loadTokenStore();
    clearToken();
    localStorageSetSpy = vi.spyOn(Storage.prototype, "setItem");
    sessionStorageSetSpy = vi.spyOn(window.sessionStorage, "setItem");
  });

  afterEach(async () => {
    const { clearToken } = await loadTokenStore();
    clearToken();
    localStorageSetSpy.mockRestore();
    sessionStorageSetSpy.mockRestore();
  });

  it("returns null before any token is set", async () => {
    const { getToken } = await loadTokenStore();
    expect(getToken()).toBeNull();
  });

  it("returns the token that was last set", async () => {
    const { getToken, setToken } = await loadTokenStore();
    setToken("id-token-abc");
    expect(getToken()).toBe("id-token-abc");
  });

  it("returns the most recently set token (overwrite semantics)", async () => {
    const { getToken, setToken } = await loadTokenStore();
    setToken("first");
    setToken("second");
    expect(getToken()).toBe("second");
  });

  it("returns null after clearToken()", async () => {
    const { getToken, setToken, clearToken } = await loadTokenStore();
    setToken("id-token-abc");
    clearToken();
    expect(getToken()).toBeNull();
  });

  it("never persists the token to localStorage or sessionStorage", async () => {
    const { setToken } = await loadTokenStore();
    setToken("id-token-abc");
    expect(localStorageSetSpy).not.toHaveBeenCalled();
    expect(sessionStorageSetSpy).not.toHaveBeenCalled();
  });
});

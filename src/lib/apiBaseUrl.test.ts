// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";

interface ApiBaseUrlModule {
  resolveApiBaseUrl: () => string;
}

async function loadModule(): Promise<ApiBaseUrlModule> {
  return (await import("./apiBaseUrl")) as ApiBaseUrlModule;
}

type HorizonGlobal = { apiBaseUrl: string } | undefined;

interface WindowWithHorizon {
  horizon?: HorizonGlobal;
}

const env = import.meta.env as Record<string, unknown>;

describe("resolveApiBaseUrl", () => {
  let originalHorizon: HorizonGlobal;
  let envHadKey: boolean;
  let originalEnvValue: unknown;

  beforeEach(() => {
    originalHorizon = (window as unknown as WindowWithHorizon).horizon;
    envHadKey = Object.prototype.hasOwnProperty.call(env, "VITE_API_BASE_URL");
    originalEnvValue = env.VITE_API_BASE_URL;
    (window as unknown as WindowWithHorizon).horizon = undefined;
  });

  afterEach(() => {
    (window as unknown as WindowWithHorizon).horizon = originalHorizon;
    if (envHadKey) {
      env.VITE_API_BASE_URL = originalEnvValue;
    } else {
      delete env.VITE_API_BASE_URL;
    }
  });

  it("returns window.horizon.apiBaseUrl when window.horizon is set, even if VITE_API_BASE_URL is also set", async () => {
    (window as unknown as WindowWithHorizon).horizon = {
      apiBaseUrl: "http://127.0.0.1:54321",
    };
    env.VITE_API_BASE_URL = "http://from-env.example";

    const { resolveApiBaseUrl } = await loadModule();

    expect(resolveApiBaseUrl()).toBe("http://127.0.0.1:54321");
  });

  it("falls back to import.meta.env.VITE_API_BASE_URL when window.horizon is undefined", async () => {
    (window as unknown as WindowWithHorizon).horizon = undefined;
    env.VITE_API_BASE_URL = "http://from-env.example";

    const { resolveApiBaseUrl } = await loadModule();

    expect(resolveApiBaseUrl()).toBe("http://from-env.example");
  });

  it("falls back to 'http://localhost:3001' when both window.horizon and VITE_API_BASE_URL are unset", async () => {
    (window as unknown as WindowWithHorizon).horizon = undefined;
    delete env.VITE_API_BASE_URL;

    const { resolveApiBaseUrl } = await loadModule();

    expect(resolveApiBaseUrl()).toBe("http://localhost:3001");
  });
});

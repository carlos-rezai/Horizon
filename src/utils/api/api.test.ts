// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../lib/apiBaseUrl", () => ({
  resolveApiBaseUrl: vi.fn(() => "http://test-host:9999"),
}));

describe("API_BASE", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("equals the value returned by resolveApiBaseUrl", async () => {
    const { API_BASE } = await import("./api");
    expect(API_BASE).toBe("http://test-host:9999");
  });
});

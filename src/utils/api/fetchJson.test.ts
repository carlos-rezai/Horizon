// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";

vi.mock("./api", () => ({ API_BASE: "http://test-host:9999" }));

import { fetchJson } from "./fetchJson";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("fetchJson", () => {
  it("resolves to the parsed body on a 2xx response", async () => {
    const body = [{ id: "a1" }];
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => body,
    } as Response);

    await expect(fetchJson("/accounts")).resolves.toEqual(body);
  });

  it("requests the path against API_BASE", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({}),
    } as Response);

    await fetchJson("/projection?months=240");

    expect(spy).toHaveBeenCalledWith(
      "http://test-host:9999/projection?months=240"
    );
  });

  it("throws an error carrying the status on a non-2xx response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 503,
    } as Response);

    await expect(fetchJson("/accounts")).rejects.toThrow(/503/);
  });

  it("names the path in the thrown error", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 500,
    } as Response);

    await expect(fetchJson("/recurring-transactions")).rejects.toThrow(
      /recurring-transactions/
    );
  });
});

// @vitest-environment jsdom
import { renderHook, waitFor, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useStorageStatus } from "./useStorageStatus";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("useStorageStatus", () => {
  it("starts in a loading state", () => {
    const fetchResolver: { fn: ((value: Response) => void) | null } = {
      fn: null,
    };
    const pending = new Promise<Response>((resolve) => {
      fetchResolver.fn = resolve;
    });
    vi.spyOn(globalThis, "fetch").mockReturnValue(pending);

    const { result } = renderHook(() => useStorageStatus());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.status).toBeNull();
    expect(result.current.error).toBeNull();

    fetchResolver.fn?.({
      ok: true,
      json: async () => ({
        driver: "sqlite",
        schemaVersion: 2,
        integrity: "ok",
        path: ":memory:",
        sizeBytes: 0,
      }),
    } as Response);
  });

  it("returns the SQLite-shaped payload after fetch succeeds", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        driver: "sqlite",
        schemaVersion: 2,
        integrity: "ok",
        path: "/Users/x/horizon.db",
        sizeBytes: 12345,
      }),
    } as Response);

    const { result } = renderHook(() => useStorageStatus());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.status).toEqual({
      driver: "sqlite",
      schemaVersion: 2,
      integrity: "ok",
      path: "/Users/x/horizon.db",
      sizeBytes: 12345,
    });
    expect(result.current.error).toBeNull();
  });

  it("returns the Mongo-shaped payload after fetch succeeds", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        driver: "mongo",
        schemaVersion: 0,
        integrity: "ok",
      }),
    } as Response);

    const { result } = renderHook(() => useStorageStatus());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.status).toEqual({
      driver: "mongo",
      schemaVersion: 0,
      integrity: "ok",
    });
  });

  it("surfaces an error when the fetch fails", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({}),
    } as Response);

    const { result } = renderHook(() => useStorageStatus());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toMatch(/500/);
    expect(result.current.status).toBeNull();
  });

  it("refetch re-issues the request and updates status", async () => {
    let call = 0;
    vi.spyOn(globalThis, "fetch").mockImplementation((() => {
      call += 1;
      return Promise.resolve({
        ok: true,
        json: async () => ({
          driver: "sqlite",
          schemaVersion: call,
          integrity: "ok",
          path: ":memory:",
          sizeBytes: 0,
        }),
      } as Response);
    }) as typeof fetch);

    const { result } = renderHook(() => useStorageStatus());

    await waitFor(() => {
      expect(result.current.status?.schemaVersion).toBe(1);
    });

    await result.current.refetch();

    await waitFor(() => {
      expect(result.current.status?.schemaVersion).toBe(2);
    });
  });
});

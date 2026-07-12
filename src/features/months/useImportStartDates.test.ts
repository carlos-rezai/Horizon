// @vitest-environment jsdom
import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { useImportStartDates } from "./useImportStartDates";
import type { ImportRecord } from "../import/importTypes";

const records: Partial<ImportRecord>[] = [
  { id: "imp-1", startDate: "2023-03-15" },
  { id: "imp-2", startDate: "2021-11-02" },
];

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useImportStartDates — fetch", () => {
  beforeEach(() => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => records,
    } as Response);
  });

  it("fetches GET /imports", async () => {
    renderHook(() => useImportStartDates());

    await act(async () => {});

    const url = vi.mocked(fetch).mock.calls[0][0];
    expect(typeof url === "string" ? url : url.toString()).toContain(
      "/imports"
    );
  });

  it("returns the start date of every import", async () => {
    const { result } = renderHook(() => useImportStartDates());

    await act(async () => {});

    expect(result.current.startDates).toEqual(["2023-03-15", "2021-11-02"]);
    expect(result.current.isLoading).toBe(false);
  });
});

describe("useImportStartDates — failure", () => {
  it("degrades to an empty list when the request fails", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("offline"));

    const { result } = renderHook(() => useImportStartDates());

    await act(async () => {});

    expect(result.current.startDates).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });
});

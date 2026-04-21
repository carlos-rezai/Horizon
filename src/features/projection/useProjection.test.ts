// @vitest-environment jsdom
import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { useProjection } from "./useProjection";
import type { MonthlySnapshot } from "../../types/projection";

const snapshot: MonthlySnapshot = {
  month: "2026-04",
  accounts: {},
  netCashflow: 0,
  totalLiquid: 0,
};

beforeEach(() => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue({
    ok: true,
    json: async () => [snapshot],
  } as Response);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useProjection", () => {
  it("fetches /projection?months=240", async () => {
    renderHook(() => useProjection());

    await act(async () => {});

    const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock
      .calls[0] as [string];
    expect(url).toContain("?months=240");
  });
});

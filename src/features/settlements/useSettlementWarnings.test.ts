// @vitest-environment jsdom
import { renderHook, act, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { useSettlementWarnings } from "./useSettlementWarnings";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("useSettlementWarnings", () => {
  it("fetches GET /settlements/warnings on mount", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => [],
    } as Response);

    renderHook(() => useSettlementWarnings());

    await act(async () => {});

    const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock
      .calls[0] as [string];
    expect(url).toContain("/settlements/warnings");
  });
});

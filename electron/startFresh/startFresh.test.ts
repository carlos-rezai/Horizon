import { describe, expect, it, vi } from "vitest";

import { startFresh, type StartFreshDeps } from "./startFresh";

function createDeps(overrides: Partial<StartFreshDeps> = {}): StartFreshDeps {
  return {
    confirm: vi.fn().mockResolvedValue(true),
    reset: vi.fn().mockResolvedValue(undefined),
    reloadWindow: vi.fn(),
    onError: vi.fn(),
    ...overrides,
  };
}

describe("startFresh", () => {
  describe("when the confirmation is declined", () => {
    it("does not reset and does not reload", async () => {
      const deps = createDeps({
        confirm: vi.fn().mockResolvedValue(false),
      });

      await startFresh(deps);

      expect(deps.reset).not.toHaveBeenCalled();
      expect(deps.reloadWindow).not.toHaveBeenCalled();
      expect(deps.onError).not.toHaveBeenCalled();
    });
  });

  describe("when the reset succeeds", () => {
    it("resets and reloads the window", async () => {
      const deps = createDeps();

      await startFresh(deps);

      expect(deps.reset).toHaveBeenCalledTimes(1);
      expect(deps.reloadWindow).toHaveBeenCalledTimes(1);
      expect(deps.onError).not.toHaveBeenCalled();
    });
  });

  describe("when the reset fails", () => {
    it("reports the error and does not reload", async () => {
      const deps = createDeps({
        reset: vi
          .fn()
          .mockRejectedValue(new Error("Reset request failed with status 500")),
      });

      await startFresh(deps);

      expect(deps.onError).toHaveBeenCalledWith(
        "Reset request failed with status 500"
      );
      expect(deps.reloadWindow).not.toHaveBeenCalled();
    });

    it("does not throw when the reset rejects", async () => {
      const deps = createDeps({
        reset: vi.fn().mockRejectedValue(new Error("boom")),
      });

      await expect(startFresh(deps)).resolves.toBeUndefined();
    });
  });
});

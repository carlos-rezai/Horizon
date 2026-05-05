import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { awaitExitOrKill } from "./awaitExitOrKill";

interface FakeChild {
  once(event: "exit", listener: () => void): void;
  kill(): void;
  emitExit(): void;
  killCalls: number;
}

function createFakeChild(): FakeChild {
  let exitListener: (() => void) | null = null;
  return {
    killCalls: 0,
    once(event, listener) {
      if (event === "exit") {
        exitListener = listener;
      }
    },
    kill() {
      this.killCalls += 1;
    },
    emitExit() {
      exitListener?.();
    },
  };
}

describe("awaitExitOrKill", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("resolves cleanly without calling kill when exit fires before the timeout", async () => {
    const child = createFakeChild();

    const pending = awaitExitOrKill(child, 5_000);
    child.emitExit();
    await pending;

    expect(child.killCalls).toBe(0);
  });

  it("calls child.kill() and resolves when the timeout elapses before exit", async () => {
    const child = createFakeChild();

    const pending = awaitExitOrKill(child, 5_000);
    await vi.advanceTimersByTimeAsync(5_000);
    await pending;

    expect(child.killCalls).toBe(1);
  });

  it("does not call kill if exit fires first and the timer would have fired later", async () => {
    const child = createFakeChild();

    const pending = awaitExitOrKill(child, 5_000);
    child.emitExit();
    await pending;
    await vi.advanceTimersByTimeAsync(10_000);

    expect(child.killCalls).toBe(0);
  });
});

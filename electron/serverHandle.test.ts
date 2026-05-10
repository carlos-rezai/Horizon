import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("electron", () => ({
  app: {
    isPackaged: false,
    getAppPath: vi.fn(() => "/app"),
    getPath: vi.fn(() => "/userData"),
  },
  utilityProcess: {
    fork: vi.fn(),
  },
}));

import { utilityProcess } from "electron";
import { createServerHandle } from "./serverHandle";

interface FakeChild {
  on(event: "message", listener: (msg: unknown) => void): FakeChild;
  once(event: "exit", listener: () => void): FakeChild;
  kill(): void;
  postMessage(msg: unknown): void;
  stdout: { on(event: string, listener: (chunk: Buffer) => void): void };
  stderr: { on(event: string, listener: (chunk: Buffer) => void): void };
  emitMessage(msg: unknown): void;
  emitExit(): void;
  sentMessages: unknown[];
  killCalls: number;
}

function createFakeChild(): FakeChild {
  let messageListener: ((msg: unknown) => void) | null = null;
  let exitListener: (() => void) | null = null;
  const sentMessages: unknown[] = [];
  let killCalls = 0;

  const child: FakeChild = {
    get sentMessages() {
      return sentMessages;
    },
    get killCalls() {
      return killCalls;
    },
    on(_event, listener) {
      messageListener = listener;
      return child;
    },
    once(_event, listener) {
      exitListener = listener;
      return child;
    },
    kill() {
      killCalls += 1;
    },
    postMessage(msg) {
      sentMessages.push(msg);
    },
    stdout: { on() {} },
    stderr: { on() {} },
    emitMessage(msg) {
      messageListener?.(msg);
    },
    emitExit() {
      exitListener?.();
    },
  };
  return child;
}

describe("createServerHandle", () => {
  let fakeChild: FakeChild;

  beforeEach(() => {
    vi.useFakeTimers();
    fakeChild = createFakeChild();
    vi.mocked(utilityProcess.fork).mockReturnValue(fakeChild as never);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("start() resolves with the port from the ready message", async () => {
    const handle = createServerHandle({ isDev: false });

    const pending = handle.start();
    fakeChild.emitMessage({ type: "ready", port: 54321 });
    const result = await pending;

    expect(result.port).toBe(54321);
  });

  it("start() rejects and calls fatalHandler when the child emits a fatal message", async () => {
    const handle = createServerHandle({ isDev: false });
    const fatalHandler = vi.fn();
    handle.onFatal(fatalHandler);

    const pending = handle.start();
    fakeChild.emitMessage({
      type: "fatal",
      kind: "integrity",
      message: "corrupted",
    });

    await expect(pending).rejects.toThrow("corrupted");
    expect(fatalHandler).toHaveBeenCalledWith("integrity", "corrupted");
  });

  it("start() rejects with a timeout error when no message arrives within READY_TIMEOUT_MS", async () => {
    const handle = createServerHandle({ isDev: false });

    const pending = handle.start();
    // Attach the rejection handler before advancing timers to avoid an
    // unhandled rejection warning from the race between the timer firing
    // and the assertion being registered.
    const assertion = expect(pending).rejects.toThrow(/did not become ready/i);
    await vi.advanceTimersByTimeAsync(10_000);
    await assertion;
  });

  it("onFatal handler fires for fatal messages received after start() resolves", async () => {
    const handle = createServerHandle({ isDev: false });
    const fatalHandler = vi.fn();
    handle.onFatal(fatalHandler);

    const pending = handle.start();
    fakeChild.emitMessage({ type: "ready", port: 3001 });
    await pending;

    fakeChild.emitMessage({ type: "fatal", kind: "unknown", message: "boom" });

    expect(fatalHandler).toHaveBeenCalledWith("unknown", "boom");
  });

  it("shutdown() posts a shutdown message and resolves once the child exits", async () => {
    const handle = createServerHandle({ isDev: false });

    const pending = handle.start();
    fakeChild.emitMessage({ type: "ready", port: 3001 });
    await pending;

    const shutdownPending = handle.shutdown(5_000);
    fakeChild.emitExit();
    await shutdownPending;

    expect(fakeChild.sentMessages).toContainEqual({ type: "shutdown" });
  });

  it("unknown message shapes are ignored and do not settle the start() promise", async () => {
    const handle = createServerHandle({ isDev: false });

    const pending = handle.start();
    fakeChild.emitMessage(null);
    fakeChild.emitMessage({ type: "unexpected" });
    fakeChild.emitMessage("plain string");
    fakeChild.emitMessage({ type: "ready", port: 8888 });
    const result = await pending;

    expect(result.port).toBe(8888);
  });
});

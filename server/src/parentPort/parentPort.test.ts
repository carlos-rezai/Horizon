import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EventEmitter } from "events";
import { postReady, postFatal, onShutdown } from "./parentPort.js";

// `process.parentPort` is the Electron utilityProcess parent channel — only
// present when the Express server is forked by the Server Handle. In the
// Cloud Build / `npm run server:dev` path it is undefined and every helper
// must be a no-op.
class FakeParentPort extends EventEmitter {
  postMessage = vi.fn();
}

const ORIGINAL_PARENT_PORT = (process as { parentPort?: unknown }).parentPort;

function setParentPort(value: unknown): void {
  (process as { parentPort?: unknown }).parentPort = value;
}

describe("parentPort — Server Handle handshake helpers (issue #68)", () => {
  let fake: FakeParentPort;

  beforeEach(() => {
    fake = new FakeParentPort();
    setParentPort(fake);
  });

  afterEach(() => {
    setParentPort(ORIGINAL_PARENT_PORT);
  });

  describe("postReady", () => {
    it("posts { type: 'ready', port } when parentPort is present", () => {
      // The Ready Handshake — the child's signal to Electron Main that
      // app.listen has bound an ephemeral port. Electron Main blocks the
      // BrowserWindow on receiving exactly this shape (PRD #66).
      postReady(54321);
      expect(fake.postMessage).toHaveBeenCalledTimes(1);
      expect(fake.postMessage).toHaveBeenCalledWith({
        type: "ready",
        port: 54321,
      });
    });
  });

  describe("postFatal", () => {
    it("posts { type: 'fatal', kind: 'integrity', message } for integrity failures", () => {
      // StorageIntegrityError → kind: 'integrity'. Electron Main matches on
      // this kind to render the dialog with the "Show data folder" button
      // (user story 15).
      postFatal("integrity", "PRAGMA integrity_check failed: malformed");
      expect(fake.postMessage).toHaveBeenCalledTimes(1);
      expect(fake.postMessage).toHaveBeenCalledWith({
        type: "fatal",
        kind: "integrity",
        message: "PRAGMA integrity_check failed: malformed",
      });
    });

    it("posts { type: 'fatal', kind: 'unknown', message } for any other failure", () => {
      // Anything else — config, port-bind, createApp throw — surfaces as
      // kind: 'unknown' (user story 16). Same dialog shape, no data-folder
      // affordance.
      postFatal("unknown", "EADDRINUSE 127.0.0.1");
      expect(fake.postMessage).toHaveBeenCalledTimes(1);
      expect(fake.postMessage).toHaveBeenCalledWith({
        type: "fatal",
        kind: "unknown",
        message: "EADDRINUSE 127.0.0.1",
      });
    });
  });

  describe("onShutdown", () => {
    it("invokes the handler when the parent port emits { type: 'shutdown' }", async () => {
      // The Shutdown Handshake. The handler runs `await storage.close()` so
      // the WAL Checkpoint folds .db-wal back into .db before the process
      // exits — without this, Online Backup is broken (user story 13).
      const handler = vi.fn().mockResolvedValue(undefined);
      onShutdown(handler);

      fake.emit("message", { type: "shutdown" });

      // Allow the message listener's async handler to resolve.
      await new Promise((resolve) => setImmediate(resolve));

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it("ignores parent-port messages that are not shutdown", async () => {
      // The parent-port channel is single-purpose for main → child traffic
      // (only `shutdown` is defined). An unrecognised message must not
      // trigger close — that would corrupt the WAL flush ordering.
      const handler = vi.fn().mockResolvedValue(undefined);
      onShutdown(handler);

      fake.emit("message", { type: "ping" });
      fake.emit("message", { type: "ready", port: 1234 });
      fake.emit("message", null);
      fake.emit("message", "shutdown");

      await new Promise((resolve) => setImmediate(resolve));

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe("no-op when parent port is absent (CLI / Cloud Build path)", () => {
    beforeEach(() => {
      setParentPort(undefined);
    });

    it("postReady does not throw and posts nothing", () => {
      // `npm run server:dev` and the Cloud Build entrypoint must keep
      // working unchanged — no parent port present, no IPC attempted.
      expect(() => postReady(3001)).not.toThrow();
      expect(fake.postMessage).not.toHaveBeenCalled();
    });

    it("postFatal does not throw and posts nothing", () => {
      // A startup crash on the CLI path should still throw / log via the
      // existing path — it must not also try to call .postMessage on
      // undefined.
      expect(() => postFatal("integrity", "boom")).not.toThrow();
      expect(() => postFatal("unknown", "boom")).not.toThrow();
      expect(fake.postMessage).not.toHaveBeenCalled();
    });

    it("onShutdown does not throw and does not invoke the handler", () => {
      // No parent port means no shutdown message will ever arrive. The
      // handler is registered against nothing — verify it stays uncalled
      // and registration itself is silent.
      const handler = vi.fn().mockResolvedValue(undefined);
      expect(() => onShutdown(handler)).not.toThrow();
      expect(handler).not.toHaveBeenCalled();
    });
  });
});

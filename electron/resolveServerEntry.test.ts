import path from "node:path";
import { describe, expect, it } from "vitest";

import { resolveServerEntry } from "./resolveServerEntry";

describe("resolveServerEntry", () => {
  it("uses appPath and bundle when packaged", () => {
    const result = resolveServerEntry(true, false, {}, "/app", "/cwd");

    expect(result.entry).toBe(
      path.join("/app", "server", "dist", "server.bundle.js")
    );
    expect(result.execArgv).toEqual([]);
  });

  it("uses cwd and server.js when compiled-dev (not packaged, isDev false)", () => {
    const result = resolveServerEntry(false, false, {}, "/app", "/cwd");

    expect(result.entry).toBe(path.join("/cwd", "server", "dist", "server.js"));
    expect(result.execArgv).toEqual([]);
  });

  it("uses cwd and server.ts with tsx execArgv when dev", () => {
    const result = resolveServerEntry(false, true, {}, "/app", "/cwd");

    expect(result.entry).toBe(path.join("/cwd", "server", "src", "server.ts"));
    expect(result.execArgv).toEqual(["--import", "tsx"]);
  });

  it("uses cwd and server.js when HORIZON_FORCE_COMPILED_SERVER=1 overrides isDev", () => {
    const result = resolveServerEntry(
      false,
      true,
      { HORIZON_FORCE_COMPILED_SERVER: "1" },
      "/app",
      "/cwd"
    );

    expect(result.entry).toBe(path.join("/cwd", "server", "dist", "server.js"));
    expect(result.execArgv).toEqual([]);
  });

  it("packaged wins over isDev — uses appPath and bundle even when isDev is true", () => {
    const result = resolveServerEntry(true, true, {}, "/app", "/cwd");

    expect(result.entry).toBe(
      path.join("/app", "server", "dist", "server.bundle.js")
    );
    expect(result.execArgv).toEqual([]);
  });
});

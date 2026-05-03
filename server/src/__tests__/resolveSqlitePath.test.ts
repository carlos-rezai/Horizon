import { describe, expect, it } from "vitest";
import { resolveSqlitePath } from "../storage/resolveSqlitePath.js";

describe("resolveSqlitePath — entrypoint env reader (issue #61)", () => {
  it("returns HORIZON_DB_PATH when it is set to a path", () => {
    // The Electron shell (design log 10) will set HORIZON_DB_PATH to
    // app.getPath('userData') + '/horizon.db'. Whatever the shell hands in
    // must reach createStorage("sqlite", { path }) verbatim.
    expect(resolveSqlitePath({ HORIZON_DB_PATH: "./tmp/foo.db" })).toBe(
      "./tmp/foo.db"
    );
  });

  it("falls back to './horizon.db' when HORIZON_DB_PATH is unset", () => {
    // Local dev default: running `npm run dev` against the SQLite driver with
    // no env var should land the file in the project root, not blow up.
    expect(resolveSqlitePath({})).toBe("./horizon.db");
  });

  it("falls back to './horizon.db' when HORIZON_DB_PATH is explicitly undefined", () => {
    // process.env entries that have never been assigned read back as undefined
    // (not missing). Nullish-coalescing must treat that the same as unset.
    expect(resolveSqlitePath({ HORIZON_DB_PATH: undefined })).toBe(
      "./horizon.db"
    );
  });
});

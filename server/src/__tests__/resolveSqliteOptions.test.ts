import { describe, expect, it } from "vitest";
import { resolveSqliteOptions } from "../storage/resolveSqliteOptions.js";

describe("resolveSqliteOptions — entrypoint env reader (issue #58)", () => {
  it("returns a verbose callback when DEBUG_SQL=1", () => {
    const opts = resolveSqliteOptions({ DEBUG_SQL: "1" });
    expect(typeof opts.verbose).toBe("function");
  });

  it("returns no verbose callback when DEBUG_SQL is unset", () => {
    const opts = resolveSqliteOptions({});
    expect(opts.verbose).toBeUndefined();
  });

  it("returns no verbose callback when DEBUG_SQL is anything other than '1'", () => {
    // Strict opt-in: only the literal "1" enables tracing. "0", "true",
    // "false", and empty string must all be off — packaged builds must never
    // accidentally light up tracing because of a sloppy env value.
    expect(resolveSqliteOptions({ DEBUG_SQL: "0" }).verbose).toBeUndefined();
    expect(resolveSqliteOptions({ DEBUG_SQL: "true" }).verbose).toBeUndefined();
    expect(resolveSqliteOptions({ DEBUG_SQL: "" }).verbose).toBeUndefined();
  });
});

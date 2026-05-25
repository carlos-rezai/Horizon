import { describe, expect, it } from "vitest";

import { parseApiBaseUrlArg } from "./parseApiBaseUrlArg";

describe("parseApiBaseUrlArg", () => {
  it("returns the value when --api-base-url= is present in argv", () => {
    const argv = [
      "C:/path/to/electron.exe",
      "C:/path/to/main.js",
      "--api-base-url=http://127.0.0.1:54321",
    ];

    expect(parseApiBaseUrlArg(argv)).toBe("http://127.0.0.1:54321");
  });

  it("returns null when --api-base-url= is not present", () => {
    const argv = [
      "C:/path/to/electron.exe",
      "C:/path/to/main.js",
      "--some-other-flag=value",
    ];

    expect(parseApiBaseUrlArg(argv)).toBeNull();
  });

  it("returns an empty string when --api-base-url= is present with no value", () => {
    const argv = [
      "C:/path/to/electron.exe",
      "C:/path/to/main.js",
      "--api-base-url=",
    ];

    expect(parseApiBaseUrlArg(argv)).toBe("");
  });
});

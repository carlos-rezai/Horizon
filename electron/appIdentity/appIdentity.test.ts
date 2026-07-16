import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { APP_USER_MODEL_ID } from "./appIdentity";

const ROOT = resolve(__dirname, "../..");

describe("APP_USER_MODEL_ID", () => {
  it("matches build.appId, the id electron-builder stamps on the shortcut", () => {
    const pkg = JSON.parse(
      readFileSync(resolve(ROOT, "package.json"), "utf-8")
    ) as { build: { appId: string } };

    expect(APP_USER_MODEL_ID).toBe(pkg.build.appId);
  });
});

import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

const ROOT = resolve(__dirname, "../..");

describe("release pipeline config", () => {
  describe("package.json electron-builder publish config", () => {
    let build: Record<string, unknown>;
    let pkg: Record<string, unknown>;

    beforeAll(() => {
      pkg = JSON.parse(
        readFileSync(resolve(ROOT, "package.json"), "utf-8")
      ) as Record<string, unknown>;
      build = pkg.build as Record<string, unknown>;
    });

    it("has a top-level repository field", () => {
      expect(pkg.repository).toBeDefined();
    });

    it("sets publish.provider to github", () => {
      const publish = build.publish as Record<string, unknown>;
      expect(publish.provider).toBe("github");
    });

    it("sets publish.repo to horizon", () => {
      const publish = build.publish as Record<string, unknown>;
      expect(publish.repo).toBe("horizon");
    });

    it("sets allowUncheckedUpdates to true", () => {
      expect(build.allowUncheckedUpdates).toBe(true);
    });
  });

  describe(".github/workflows/release.yml", () => {
    let workflow: string;

    beforeAll(() => {
      const workflowPath = resolve(ROOT, ".github/workflows/release.yml");
      expect(existsSync(workflowPath), "release.yml does not exist").toBe(true);
      workflow = readFileSync(workflowPath, "utf-8");
    });

    it("triggers on v* tag push", () => {
      expect(workflow).toMatch(/tags:/);
      expect(workflow).toMatch(/['"]?v\*/);
    });

    it("runs on windows-latest", () => {
      expect(workflow).toContain("windows-latest");
    });

    it("runs electron-builder --publish always", () => {
      expect(workflow).toContain("electron-builder --publish always");
    });
  });
});

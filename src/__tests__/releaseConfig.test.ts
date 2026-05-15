import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { createRequire } from "module";

const ROOT = resolve(__dirname, "../..");
const req = createRequire(import.meta.url);

type WinConfig = {
  certificateFile?: string;
  certificatePassword?: string;
  [key: string]: unknown;
};

type BuilderConfig = {
  appId: string;
  win: WinConfig;
  publish: { provider: string; [key: string]: unknown };
  [key: string]: unknown;
};

type BuildConfig = (env: Record<string, string | undefined>) => BuilderConfig;

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

describe("electron-builder.config.js cert configuration", () => {
  let buildConfig: BuildConfig;

  beforeAll(() => {
    const configPath = resolve(ROOT, "electron-builder.config.js");
    expect(
      existsSync(configPath),
      "electron-builder.config.js does not exist"
    ).toBe(true);
    const mod = req(configPath) as { buildConfig?: BuildConfig };
    expect(typeof mod.buildConfig, "buildConfig export is missing").toBe(
      "function"
    );
    buildConfig = mod.buildConfig!;
  });

  it("includes win.certificateFile and win.certificatePassword when WIN_CERTIFICATE_FILE is set", () => {
    const config = buildConfig({
      WIN_CERTIFICATE_FILE: "/path/to/cert.pfx",
      WIN_CERTIFICATE_PASSWORD: "s3cret",
    });
    expect(config.win.certificateFile).toBe("/path/to/cert.pfx");
    expect(config.win.certificatePassword).toBe("s3cret");
  });

  it("omits win.certificateFile and win.certificatePassword when WIN_CERTIFICATE_FILE is not set", () => {
    const config = buildConfig({});
    expect(config.win.certificateFile).toBeUndefined();
    expect(config.win.certificatePassword).toBeUndefined();
  });

  it("preserves appId in all configurations", () => {
    const config = buildConfig({});
    expect(config.appId).toBe("io.github.carlosrezai.horizon");
  });

  it("preserves publish.provider as github in all configurations", () => {
    const config = buildConfig({});
    expect(config.publish.provider).toBe("github");
  });
});

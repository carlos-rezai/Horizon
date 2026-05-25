import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SQLITE_DIR = path.resolve(__dirname);

function listSourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...listSourceFiles(full));
    } else if (entry.isFile() && entry.name.endsWith(".ts")) {
      out.push(full);
    }
  }
  return out;
}

describe("SQLite driver env isolation (issue #61 AC #2)", () => {
  it("no file under server/src/storage/sqlite/ reads process.env", () => {
    // The driver takes `path` as its only argument. The env-var seam lives at
    // the entrypoint (server.ts) so Electron main can set HORIZON_DB_PATH
    // before spawning the Express child without the driver knowing anything
    // about the environment it runs in. A regression here would re-couple the
    // driver to its host process.
    const offenders: string[] = [];
    for (const file of listSourceFiles(SQLITE_DIR)) {
      const contents = fs.readFileSync(file, "utf8");
      if (contents.includes("process.env")) {
        offenders.push(path.relative(SQLITE_DIR, file));
      }
    }
    expect(offenders).toEqual([]);
  });
});

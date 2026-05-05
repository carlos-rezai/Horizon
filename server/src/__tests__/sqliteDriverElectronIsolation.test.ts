import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SQLITE_DIR = path.resolve(__dirname, "..", "storage", "sqlite");

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

describe("SQLite driver Electron isolation (issue #68 AC #9)", () => {
  it("no file under server/src/storage/sqlite/ imports from 'electron'", () => {
    // The seam established in design log 09 Q2 — and reaffirmed by user
    // story 30 — is that the SQLite Driver knows nothing about Electron.
    // Electron Main is the only producer of HORIZON_DB_PATH; the driver
    // takes a `path` argument and stays unit-testable in isolation.
    // Importing 'electron' anywhere inside the driver would re-couple it
    // to the host process and break test runs on the Cloud Build.
    const importPattern = /from\s+["']electron(?:\/[^"']*)?["']|require\(\s*["']electron(?:\/[^"']*)?["']\s*\)/;
    const offenders: string[] = [];
    for (const file of listSourceFiles(SQLITE_DIR)) {
      const contents = fs.readFileSync(file, "utf8");
      if (importPattern.test(contents)) {
        offenders.push(path.relative(SQLITE_DIR, file));
      }
    }
    expect(offenders).toEqual([]);
  });
});

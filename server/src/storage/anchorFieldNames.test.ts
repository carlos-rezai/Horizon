import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Balance Anchor (issue #230): Opening Balance / Opening Date became Anchor
// Balance / Anchor Date with no aliases and no shim. Client and server ship
// together, so no old identifier may survive in either tier's TypeScript.
// The SQL migrations are history and keep their column names.

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), "../../..");
const SCANNED_ROOTS = ["server/src", "src"];

// Built from parts so this file does not match itself.
const OLD_NAMES = new RegExp(
  [
    "opening" + "Balance",
    "opening" + "Date",
    "opening" + "_balance",
    "opening" + "_date",
  ].join("|")
);

function listTsFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...listTsFiles(full));
    } else if (entry.isFile() && /\.tsx?$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

describe("Balance Anchor rename", () => {
  it("leaves no opening-balance or opening-date identifier in server or client code", () => {
    const offenders: string[] = [];
    for (const root of SCANNED_ROOTS) {
      for (const file of listTsFiles(path.join(REPO_ROOT, root))) {
        if (OLD_NAMES.test(fs.readFileSync(file, "utf8"))) {
          offenders.push(path.relative(REPO_ROOT, file).replace(/\\/g, "/"));
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});

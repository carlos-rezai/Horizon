// Strips machine-identifying metadata from chrome-devtools performance traces
// before they are committed as portfolio artifacts.
//
// A raw trace's `metadata` block carries a fingerprint of the capturing
// machine — the full browser command line (which includes the local user
// profile path), motherboard model, GPU driver version, CPU stepping, and
// antivirus state. None of it is needed to read the trace; all of it is
// published permanently once committed.
//
// Fields that make the numbers interpretable (core count, RAM, GPU model,
// OS version, user agent) are deliberately kept — a perf baseline without
// them is not reviewable.
//
// Usage:
//   node scripts/sanitize-trace.mjs docs/perf/<dir>/*.json.gz
//   node scripts/sanitize-trace.mjs --check docs/perf/<dir>/*.json.gz
//
// Idempotent: re-running on a sanitized trace is a no-op. With --check it
// exits non-zero if any file still carries a stripped field, so it can gate
// a commit.

import { globSync, readFileSync, writeFileSync } from "node:fs";
import { gunzipSync, gzipSync } from "node:zlib";

// Dropped entirely: local paths, and hardware identifiers precise enough to
// fingerprint one machine.
const STRIP = [
  "command_line",
  "hardware-class",
  "full-hardware-class",
  "antivirus-product-",
  "cpu-signature",
  "gpu-driver-version",
  "gpu-vendor-id",
  "drive-has_seek_penalty",
  "os-build-fingerprint",
];

const PLACEHOLDER = "[stripped by scripts/sanitize-trace.mjs]";

const args = process.argv.slice(2);
const checkOnly = args.includes("--check");
const patterns = args.filter((a) => !a.startsWith("--"));

// Expand globs here rather than relying on the shell: bash expands `*.json.gz`
// before we see it, but PowerShell passes the literal pattern through to a
// native command, so the documented invocation would otherwise ENOENT on the
// project's primary shell.
const files = [
  ...new Set(
    patterns.flatMap((p) => {
      if (!/[*?[]/.test(p)) return [p];
      const hits = globSync(p.replace(/\\/g, "/"));
      if (hits.length === 0) console.error(`warning: no files matched ${p}`);
      return hits;
    })
  ),
].sort();

if (files.length === 0) {
  console.error(
    "usage: node scripts/sanitize-trace.mjs [--check] <trace.json.gz...>"
  );
  process.exit(2);
}

let dirty = 0;

for (const file of files) {
  const gzipped = file.endsWith(".gz");
  const buf = readFileSync(file);
  const text = (gzipped ? gunzipSync(buf) : buf).toString("utf8");
  const trace = JSON.parse(text);

  const metadata = Array.isArray(trace) ? null : trace.metadata;
  // A stripped field keeps its key and carries the placeholder, so presence
  // alone does not mean dirty — only a surviving real value does.
  const found = metadata
    ? STRIP.filter((k) => k in metadata && metadata[k] !== PLACEHOLDER)
    : [];

  if (found.length === 0) {
    console.log(`clean    ${file}`);
    continue;
  }

  dirty += 1;

  if (checkOnly) {
    console.error(`DIRTY    ${file} — carries ${found.join(", ")}`);
    continue;
  }

  // Leave a marker rather than deleting the key outright, so a reader can
  // tell the field was removed on purpose and not missing from capture.
  for (const key of found) metadata[key] = PLACEHOLDER;

  const out = JSON.stringify(trace);
  writeFileSync(
    file,
    gzipped ? gzipSync(out, { level: 9 }) : Buffer.from(out, "utf8")
  );
  console.log(`sanitized ${file} — stripped ${found.join(", ")}`);
}

if (checkOnly && dirty > 0) {
  console.error(
    `\n${dirty} trace(s) still carry machine-identifying metadata.`
  );
  process.exit(1);
}

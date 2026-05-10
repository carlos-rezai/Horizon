import { cpSync } from "node:fs";

const destArg = process.argv.find((a) => a.startsWith("--dest="));
if (!destArg) {
  console.error("Usage: node scripts/copy-migrations.mjs --dest=<path>");
  process.exit(1);
}
const dest = destArg.slice("--dest=".length);

cpSync("server/src/storage/sqlite/migrations", dest, {
  recursive: true,
  force: true,
});

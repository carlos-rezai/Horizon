import { cpSync } from "node:fs";

cpSync(
  "server/src/storage/sqlite/migrations",
  "server/dist/storage/sqlite/migrations",
  { recursive: true, force: true }
);

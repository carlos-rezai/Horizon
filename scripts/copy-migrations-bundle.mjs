import { cpSync } from "node:fs";

cpSync("server/src/storage/sqlite/migrations", "server/dist/migrations", {
  recursive: true,
  force: true,
});

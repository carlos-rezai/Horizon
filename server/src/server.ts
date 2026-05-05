import { config } from "dotenv";
config({ path: "server/.env" });
import { createApp } from "./app.js";
import { createStorage } from "./storage/index.js";
import { resolveSqliteOptions } from "./storage/resolveSqliteOptions.js";
import { resolveSqlitePath } from "./storage/resolveSqlitePath.js";
import { StorageIntegrityError } from "./storage/sqlite/errors.js";
import { onShutdown, postFatal, postReady } from "./parentPort.js";
import type { Storage } from "./storage/Storage.js";

const PORT = Number(process.env.PORT ?? 3001);
const driver = process.env.STORAGE_DRIVER === "sqlite" ? "sqlite" : "mongo";
const sqliteOptions = resolveSqliteOptions(process.env);

async function buildStorage(): Promise<Storage> {
  if (driver === "sqlite") {
    return createStorage("sqlite", {
      path: resolveSqlitePath(process.env),
      ...sqliteOptions,
    });
  }
  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    console.error("MONGODB_URI environment variable is required");
    process.exit(1);
  }
  return createStorage("mongo", {
    uri: MONGODB_URI,
    ...sqliteOptions,
  });
}

async function main(): Promise<void> {
  const storage = await buildStorage();
  const app = await createApp(storage);

  onShutdown(async () => {
    await storage.close();
    process.exit(0);
  });

  const server = app.listen(PORT, "127.0.0.1", () => {
    const address = server.address();
    const boundPort =
      typeof address === "object" && address !== null ? address.port : PORT;
    console.info(`Server running on port ${boundPort}`);
    postReady(boundPort);
  });
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  const kind = err instanceof StorageIntegrityError ? "integrity" : "unknown";
  console.error(err);
  postFatal(kind, message);
  process.exit(1);
});

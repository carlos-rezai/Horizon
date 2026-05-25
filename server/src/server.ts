import { config } from "dotenv";
config({ path: "server/.env" });
import { createApp } from "./app.js";
import { createStorage } from "./storage/index.js";
import { resolveSqliteOptions } from "./storage/resolveSqliteOptions.js";
import { resolveSqlitePath } from "./storage/resolveSqlitePath.js";
import { StorageIntegrityError } from "./storage/sqlite/errors.js";
import { onShutdown, postFatal, postReady } from "./parentPort/parentPort.js";

const PORT = Number(process.env.PORT ?? 3001);

async function main(): Promise<void> {
  const storage = await createStorage({
    path: resolveSqlitePath(process.env),
    ...resolveSqliteOptions(process.env),
  });
  const app = await createApp(storage);

  onShutdown(async () => {
    await storage.close();
    process.exit(0);
  });

  // Security invariant: loopback-only — the desktop build must never be reachable off-box.
  // Changing this to 0.0.0.0 would expose an auth-disabled server to the local network.
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

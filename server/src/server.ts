import { config } from "dotenv";
config({ path: "server/.env" });
import { createApp } from "./app.js";
import { createStorage } from "./storage/index.js";
import { resolveSqliteOptions } from "./storage/resolveSqliteOptions.js";
import { resolveSqlitePath } from "./storage/resolveSqlitePath.js";

const PORT = process.env.PORT ?? 3001;
const driver = process.env.STORAGE_DRIVER === "sqlite" ? "sqlite" : "mongo";
const sqliteOptions = resolveSqliteOptions(process.env);

async function buildStorage() {
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

const storage = await buildStorage();
const app = await createApp(storage);

app.listen(PORT, () => {
  console.info(`Server running on port ${PORT}`);
});

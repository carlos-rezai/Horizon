import type { Storage } from "./Storage.js";
import { createMongoStorage } from "./mongo/MongoStorage.js";
import { createSqliteStorage } from "./sqlite/SqliteStorage.js";

export interface CreateStorageOptions {
  uri?: string;
  path?: string;
  verbose?: (sql: string) => void;
}

export async function createStorage(
  driver: "mongo" | "sqlite",
  options?: CreateStorageOptions
): Promise<Storage> {
  if (driver === "mongo") {
    if (!options?.uri) {
      throw new Error("Mongo storage driver requires a 'uri' option");
    }
    return createMongoStorage(options.uri);
  }
  if (driver === "sqlite") {
    if (!options?.path) {
      throw new Error("SQLite storage driver requires a 'path' option");
    }
    return createSqliteStorage(options.path, { verbose: options.verbose });
  }
  throw new Error(`Unknown storage driver: ${String(driver)}`);
}

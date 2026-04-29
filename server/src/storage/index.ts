import type { Storage } from "./Storage.js";
import { createMongoStorage } from "./mongo/MongoStorage.js";
import { createSqliteStorage } from "./sqlite/SqliteStorage.js";

export interface CreateStorageOptions {
  uri?: string;
  path?: string;
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
    const path = options?.path ?? ":memory:";
    return createSqliteStorage(path);
  }
  throw new Error(`Unknown storage driver: ${String(driver)}`);
}

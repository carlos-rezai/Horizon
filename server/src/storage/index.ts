import type { Storage } from "./Storage.js";
import { createSqliteStorage } from "./sqlite/SqliteStorage.js";

export interface CreateStorageOptions {
  path: string;
  verbose?: (sql: string) => void;
}

export async function createStorage(
  options: CreateStorageOptions
): Promise<Storage> {
  return createSqliteStorage(options.path, { verbose: options.verbose });
}

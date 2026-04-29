import { describe } from "vitest";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { createStorage } from "../storage/index.js";
import type { Storage } from "../storage/Storage.js";
import { runStorageSpec } from "./storage.parity.js";

describe("Mongo Storage Driver — parity", () => {
  let mongod: MongoMemoryReplSet;
  let storage: Storage;

  runStorageSpec(async () => {
    mongod = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    storage = await createStorage("mongo", { uri: mongod.getUri() });

    return {
      storage,
      reset: async () => {
        const { connection } = await import("mongoose");
        const collections = await connection.db?.collections();
        if (!collections) return;
        for (const collection of collections) {
          if (collection.collectionName === "categories") {
            await collection.deleteMany({ isDefault: false });
          } else {
            await collection.deleteMany({});
          }
        }
      },
      cleanup: async () => {
        await storage.close();
        await mongod.stop();
      },
    };
  });
});

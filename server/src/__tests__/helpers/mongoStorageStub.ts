import type { Storage, StorageStatus } from "../../storage/Storage.js";

export function createMongoStorageStub(overrides?: Partial<Storage>): Storage {
  return {
    accounts: {} as Storage["accounts"],
    transactions: {} as Storage["transactions"],
    transfers: {} as Storage["transfers"],
    categories: {} as Storage["categories"],
    milestones: {} as Storage["milestones"],
    recurringTransactions: {} as Storage["recurringTransactions"],
    close: async () => undefined,
    backup: async () => {
      throw new Error("not supported");
    },
    restore: async () => {
      throw new Error("not supported");
    },
    status: async (): Promise<StorageStatus> => ({
      driver: "mongo",
      schemaVersion: 0,
      integrity: "ok",
    }),
    ...overrides,
  };
}

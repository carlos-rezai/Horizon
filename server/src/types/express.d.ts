import type { Storage } from "../storage/Storage.js";

declare global {
  namespace Express {
    interface Locals {
      storage: Storage;
    }
  }
}

export {};

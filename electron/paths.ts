import path from "node:path";
import { app } from "electron";

export function resolveDbPath(): string {
  return path.join(app.getPath("userData"), "horizon.db");
}

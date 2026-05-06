import { contextBridge } from "electron";

const FLAG = "--api-base-url=";

function parseApiBaseUrlArg(argv: readonly string[]): string | null {
  for (const arg of argv) {
    if (arg.startsWith(FLAG)) return arg.slice(FLAG.length);
  }
  return null;
}

const apiBaseUrl = parseApiBaseUrlArg(process.argv) ?? "";

contextBridge.exposeInMainWorld("horizon", {
  apiBaseUrl,
  platform: "electron",
});

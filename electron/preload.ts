import { contextBridge } from "electron";
import { parseApiBaseUrlArg } from "./parseApiBaseUrlArg.js";

const apiBaseUrl = parseApiBaseUrlArg(process.argv) ?? "";

contextBridge.exposeInMainWorld("horizon", {
  apiBaseUrl,
  platform: "electron",
});

import { contextBridge, ipcRenderer } from "electron";
import { parseApiBaseUrlArg } from "./parseApiBaseUrlArg.js";

const apiBaseUrl = parseApiBaseUrlArg(process.argv) ?? "";

contextBridge.exposeInMainWorld("horizon", {
  apiBaseUrl,
  platform: process.platform,
  updates: {
    onUpdateDownloaded(cb: () => void) {
      const handler = () => cb();
      ipcRenderer.on("update-downloaded", handler);
      return () => ipcRenderer.removeListener("update-downloaded", handler);
    },
    quitAndInstall() {
      void ipcRenderer.invoke("update:quit-and-install");
    },
    downloadUpdate() {
      void ipcRenderer.invoke("update:download");
    },
  },
});

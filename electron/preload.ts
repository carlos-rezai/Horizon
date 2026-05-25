import { contextBridge, ipcRenderer } from "electron";
import { parseApiBaseUrlArg } from "./parseApiBaseUrlArg/parseApiBaseUrlArg.js";

const apiBaseUrl = parseApiBaseUrlArg(process.argv) ?? "";

contextBridge.exposeInMainWorld("horizon", {
  apiBaseUrl,
  platform: process.platform,
  electronVersion: process.versions.electron,
  updates: {
    onUpdateDownloaded(cb: () => void) {
      const handler = () => cb();
      ipcRenderer.on("update-downloaded", handler);
      return () => ipcRenderer.removeListener("update-downloaded", handler);
    },
    onUpdateAvailable(cb: () => void) {
      const handler = () => cb();
      ipcRenderer.on("update-available", handler);
      return () => ipcRenderer.removeListener("update-available", handler);
    },
    quitAndInstall() {
      void ipcRenderer.invoke("update:quit-and-install");
    },
    downloadUpdate() {
      void ipcRenderer.invoke("update:download");
    },
    getAppVersion(): Promise<string> {
      return ipcRenderer.invoke("app:get-version") as Promise<string>;
    },
    getAutoDownload(): Promise<boolean> {
      return ipcRenderer.invoke("update:get-auto-download") as Promise<boolean>;
    },
    setAutoDownload(enabled: boolean): Promise<void> {
      return ipcRenderer.invoke(
        "update:set-auto-download",
        enabled
      ) as Promise<void>;
    },
  },
});

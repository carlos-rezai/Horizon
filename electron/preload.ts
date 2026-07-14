import { contextBridge, ipcRenderer } from "electron";
import { parseApiBaseUrlArg } from "./parseApiBaseUrlArg/parseApiBaseUrlArg.js";

// These payload shapes mirror the renderer contract in src/types/horizon.d.ts.
// The two sides sit across the IPC serialization boundary and cannot share a
// module (the electron and src TypeScript projects are separate), so they are
// kept in sync by hand.
interface MenuNotification {
  tone: "success" | "info" | "error";
  title: string;
  message: string;
  detail?: string;
}

interface MenuConfirmRequest {
  id: number;
  title: string;
  message: string;
  detail?: string;
  tone?: "default" | "danger";
  confirmLabel?: string;
  cancelLabel?: string;
}

interface ManualUpdateResult {
  state: "checking" | "uptodate" | "error" | "dev-unavailable";
  message?: string;
}

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
    onManualResult(cb: (result: ManualUpdateResult) => void) {
      const handler = (_event: unknown, result: ManualUpdateResult) =>
        cb(result);
      ipcRenderer.on("update-manual-result", handler);
      return () => ipcRenderer.removeListener("update-manual-result", handler);
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
  menu: {
    onNavigate(cb: (route: string) => void) {
      const handler = (_event: unknown, route: string) => cb(route);
      ipcRenderer.on("menu:navigate", handler);
      return () => ipcRenderer.removeListener("menu:navigate", handler);
    },
    onNotify(cb: (notification: MenuNotification) => void) {
      const handler = (_event: unknown, notification: MenuNotification) =>
        cb(notification);
      ipcRenderer.on("menu:notify", handler);
      return () => ipcRenderer.removeListener("menu:notify", handler);
    },
    onConfirm(cb: (request: MenuConfirmRequest) => void) {
      const handler = (_event: unknown, request: MenuConfirmRequest) =>
        cb(request);
      ipcRenderer.on("menu:confirm", handler);
      return () => ipcRenderer.removeListener("menu:confirm", handler);
    },
    respondConfirm(id: number, confirmed: boolean) {
      ipcRenderer.send("menu:confirm-result", { id, confirmed });
    },
  },
});

import path from "node:path";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { BrowserWindow, Menu, app, dialog, ipcMain, shell } from "electron";
import electronUpdaterPkg from "electron-updater";
import ElectronStore from "electron-store";
import { resolveDbPath } from "./paths/paths.js";
import { resolveRendererConfig } from "./resolveRendererConfig/resolveRendererConfig.js";
import { createServerHandle } from "./serverHandle/serverHandle.js";
import { buildMenu } from "./buildMenu/buildMenu.js";
const devAppVersion = (
  JSON.parse(
    readFileSync(
      fileURLToPath(new URL("../../package.json", import.meta.url)),
      "utf-8"
    )
  ) as { version: string }
).version;

interface HorizonPreferences {
  autoDownload: boolean;
}

const prefs = new ElectronStore<HorizonPreferences>({
  defaults: { autoDownload: true },
});

const { autoUpdater } = electronUpdaterPkg;
const SHUTDOWN_TIMEOUT_MS = 5_000;

const isDev = !app.isPackaged;
const { loadProdRenderer } = resolveRendererConfig(app.isPackaged, process.env);

const serverHandle = createServerHandle({ isDev });

let mainWindow: BrowserWindow | null = null;
let serverPort: number | null = null;
let fatalDialogShown = false;
let serverShuttingDown = false;
let serverShutdownComplete = false;

function focusExistingWindow(): void {
  if (!mainWindow) {
    return;
  }
  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }
  mainWindow.focus();
}

function showFatalDialog(kind: "integrity" | "unknown", message: string): void {
  fatalDialogShown = true;

  if (kind === "integrity") {
    const choice = dialog.showMessageBoxSync({
      type: "error",
      title: "Horizon — Storage error",
      message: "Horizon could not open your data file.",
      detail: message,
      buttons: ["Quit", "Show data folder"],
      defaultId: 0,
      cancelId: 0,
      noLink: true,
    });
    if (choice === 1) {
      shell.showItemInFolder(resolveDbPath());
    }
    return;
  }

  dialog.showMessageBoxSync({
    type: "error",
    title: "Horizon — Fatal error",
    message: "Horizon could not start.",
    detail: message,
    buttons: ["Quit"],
    defaultId: 0,
    noLink: true,
  });
}

function appVersion(): string {
  return app.isPackaged ? app.getVersion() : devAppVersion;
}

function showDataFolder(): void {
  shell.showItemInFolder(resolveDbPath());
}

function showAbout(): void {
  const choice = dialog.showMessageBoxSync({
    type: "info",
    title: "About Horizon",
    message: `Horizon ${appVersion()}`,
    detail: [
      `Electron ${process.versions.electron}`,
      `Chromium ${process.versions.chrome}`,
      `Node ${process.versions.node}`,
    ].join("\n"),
    buttons: ["OK", "Show data folder"],
    defaultId: 0,
    cancelId: 0,
    noLink: true,
  });
  if (choice === 1) {
    showDataFolder();
  }
}

async function createBackup(): Promise<void> {
  if (!mainWindow || serverPort === null) {
    return;
  }

  const result = await dialog.showSaveDialog(mainWindow, {
    title: "Create Backup",
    defaultPath: "horizon-backup.db",
    filters: [{ name: "Horizon backup", extensions: ["db"] }],
  });

  if (result.canceled || !result.filePath) {
    return;
  }

  try {
    const response = await fetch(
      `http://127.0.0.1:${serverPort}/storage/backup-to`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: result.filePath }),
      }
    );

    if (!response.ok) {
      throw new Error(`Backup request failed with status ${response.status}`);
    }

    dialog.showMessageBoxSync(mainWindow, {
      type: "info",
      title: "Backup created",
      message: "Your Horizon backup was created successfully.",
      detail: result.filePath,
      buttons: ["OK"],
      defaultId: 0,
      noLink: true,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    dialog.showMessageBoxSync(mainWindow, {
      type: "error",
      title: "Backup failed",
      message: "Horizon could not create the backup.",
      detail: message,
      buttons: ["OK"],
      defaultId: 0,
      noLink: true,
    });
  }
}

async function restoreFromBackup(): Promise<void> {
  if (!mainWindow || serverPort === null) {
    return;
  }

  const result = await dialog.showOpenDialog(mainWindow, {
    title: "Restore from Backup",
    filters: [{ name: "Horizon backup", extensions: ["db"] }],
    properties: ["openFile"],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return;
  }

  const sourcePath = result.filePaths[0];

  const confirm = dialog.showMessageBoxSync(mainWindow, {
    type: "warning",
    title: "Restore from Backup",
    message: "Replace all current data with this backup?",
    detail:
      "Your current Horizon data will be permanently overwritten by the " +
      `backup at:\n${sourcePath}\n\nThis cannot be undone.`,
    buttons: ["Cancel", "Restore"],
    defaultId: 0,
    cancelId: 0,
    noLink: true,
  });

  if (confirm !== 1) {
    return;
  }

  try {
    const response = await fetch(
      `http://127.0.0.1:${serverPort}/storage/restore-from`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: sourcePath }),
      }
    );

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      throw new Error(
        body?.error ?? `Restore request failed with status ${response.status}`
      );
    }

    mainWindow.webContents.reload();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    dialog.showMessageBoxSync(mainWindow, {
      type: "error",
      title: "Restore failed",
      message: "Horizon could not restore from the backup.",
      detail: message,
      buttons: ["OK"],
      defaultId: 0,
      noLink: true,
    });
  }
}

async function startFresh(): Promise<void> {
  if (!mainWindow || serverPort === null) {
    return;
  }

  const confirm = dialog.showMessageBoxSync(mainWindow, {
    type: "warning",
    title: "Start Fresh",
    message: "Erase all Horizon data and start over?",
    detail:
      "Every account, transaction, recurring entry, and import will be " +
      "permanently deleted, leaving Horizon as it was on first launch. " +
      "This cannot be undone.\n\nTo keep a copy, cancel and use " +
      "File → Create Backup first.",
    buttons: ["Cancel", "Erase everything"],
    defaultId: 0,
    cancelId: 0,
    noLink: true,
  });

  if (confirm !== 1) {
    return;
  }

  try {
    const response = await fetch(
      `http://127.0.0.1:${serverPort}/storage/reset`,
      {
        method: "POST",
      }
    );

    if (!response.ok) {
      throw new Error(`Reset request failed with status ${response.status}`);
    }

    mainWindow.webContents.reload();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    dialog.showMessageBoxSync(mainWindow, {
      type: "error",
      title: "Start Fresh failed",
      message: "Horizon could not reset your data.",
      detail: message,
      buttons: ["OK"],
      defaultId: 0,
      noLink: true,
    });
  }
}

function installApplicationMenu(): void {
  const menu = Menu.buildFromTemplate(
    buildMenu({
      isDev,
      settings: () => {
        mainWindow?.webContents.send("menu:navigate", "/settings/storage");
      },
      backup: () => {
        void createBackup();
      },
      restore: () => {
        void restoreFromBackup();
      },
      startFresh: () => {
        void startFresh();
      },
      checkUpdates: () => {},
      about: showAbout,
      showDataFolder,
    })
  );
  Menu.setApplicationMenu(menu);
}

async function createWindow(port: number): Promise<void> {
  const preloadPath = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    "preload.js"
  );

  mainWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      preload: preloadPath,
      additionalArguments: [`--api-base-url=http://127.0.0.1:${port}`],
    },
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  if (loadProdRenderer) {
    const appRoot = app.isPackaged ? app.getAppPath() : process.cwd();
    await mainWindow.loadFile(path.join(appRoot, "dist", "index.html"));
  } else {
    await mainWindow.loadURL("http://localhost:5173");
  }
  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools();
  }
}

function setupAutoUpdater(): void {
  autoUpdater.autoDownload = prefs.get("autoDownload");
  autoUpdater.on("error", () => {});
  autoUpdater.on("update-downloaded", () => {
    mainWindow?.webContents.send("update-downloaded");
  });
  autoUpdater.on("update-available", () => {
    if (!prefs.get("autoDownload")) {
      mainWindow?.webContents.send("update-available");
    }
  });
  ipcMain.handle("update:quit-and-install", () => {
    autoUpdater.quitAndInstall();
  });
  ipcMain.handle("update:download", () => {
    void autoUpdater.downloadUpdate();
  });
  ipcMain.handle("update:get-auto-download", () => prefs.get("autoDownload"));
  ipcMain.handle("update:set-auto-download", (_event, enabled: boolean) => {
    prefs.set("autoDownload", enabled);
    autoUpdater.autoDownload = enabled;
  });
  ipcMain.handle("app:get-version", () =>
    app.isPackaged ? app.getVersion() : devAppVersion
  );
  if (app.isPackaged) {
    void autoUpdater.checkForUpdates();
  }
}

async function main(): Promise<void> {
  const gotLock = app.requestSingleInstanceLock();
  if (!gotLock) {
    app.exit(0);
    return;
  }

  app.on("second-instance", () => {
    focusExistingWindow();
  });

  serverHandle.onFatal((kind, message) => {
    showFatalDialog(kind, message);
    app.exit(1);
  });

  await app.whenReady();

  installApplicationMenu();

  try {
    const { port } = await serverHandle.start();
    serverPort = port;
    await createWindow(port);
    setupAutoUpdater();
  } catch (err) {
    if (!fatalDialogShown) {
      const message = err instanceof Error ? err.message : String(err);
      showFatalDialog("unknown", message);
    }
    app.exit(1);
  }
}

app.on("window-all-closed", () => {
  app.quit();
});

app.on("before-quit", (event) => {
  if (serverShutdownComplete) {
    return;
  }
  if (serverShuttingDown) {
    event.preventDefault();
    return;
  }
  event.preventDefault();
  serverShuttingDown = true;
  void serverHandle.shutdown(SHUTDOWN_TIMEOUT_MS).finally(() => {
    serverShutdownComplete = true;
    app.quit();
  });
});

void main();

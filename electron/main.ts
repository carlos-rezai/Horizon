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
import { runManualUpdateCheck } from "./runManualUpdateCheck/runManualUpdateCheck.js";
import { createBackup as runCreateBackup } from "./createBackup/createBackup.js";
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

// Menu-driven in-app notifications. The application menu fires in the main
// process, but its result messages render in the renderer. This shape mirrors
// the renderer contract in src/types/horizon.d.ts (the two sides sit across the
// IPC boundary and cannot share a module).
interface MenuNotification {
  tone: "success" | "info" | "error";
  title: string;
  message: string;
  detail?: string;
}

/** Pushes a one-way notification to the renderer (menu:notify). */
function notifyRenderer(notification: MenuNotification): void {
  mainWindow?.webContents.send("menu:notify", notification);
}

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

function createBackup(): Promise<void> {
  const window = mainWindow;
  const port = serverPort;
  if (!window || port === null) {
    return Promise.resolve();
  }

  return runCreateBackup({
    pickSavePath: async () => {
      const result = await dialog.showSaveDialog(window, {
        title: "Create Backup",
        defaultPath: "horizon-backup.db",
        filters: [{ name: "Horizon backup", extensions: ["db"] }],
      });
      return result.canceled || !result.filePath ? null : result.filePath;
    },
    backupTo: async (path) => {
      const response = await fetch(
        `http://127.0.0.1:${port}/storage/backup-to`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path }),
        }
      );
      if (!response.ok) {
        throw new Error(`Backup request failed with status ${response.status}`);
      }
    },
    onSuccess: (path) => {
      notifyRenderer({
        tone: "success",
        title: "Backup created",
        message: "Your Horizon backup was created successfully.",
        detail: path,
      });
    },
    onError: (message) => {
      notifyRenderer({
        tone: "error",
        title: "Backup failed",
        message: "Horizon could not create the backup.",
        detail: message,
      });
    },
  });
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

function checkForUpdatesManual(): Promise<void> {
  return runManualUpdateCheck({
    isPackaged: app.isPackaged,
    checkForUpdates: async () => {
      const result = await autoUpdater.checkForUpdates();
      return result ? { isUpdateAvailable: result.isUpdateAvailable } : null;
    },
    onUpToDate: () => {
      dialog.showMessageBoxSync({
        type: "info",
        title: "Check for Updates",
        message: "You're up to date.",
        detail: `Horizon ${appVersion()} is the latest version.`,
        buttons: ["OK"],
        defaultId: 0,
        noLink: true,
      });
    },
    onError: (message) => {
      dialog.showMessageBoxSync({
        type: "error",
        title: "Check for Updates",
        message: "Horizon could not check for updates.",
        detail: message,
        buttons: ["OK"],
        defaultId: 0,
        noLink: true,
      });
    },
    onDevUnavailable: () => {
      dialog.showMessageBoxSync({
        type: "info",
        title: "Check for Updates",
        message: "Updates are only available in the installed app.",
        detail:
          "You're running Horizon from a development build. Install the packaged app to receive updates.",
        buttons: ["OK"],
        defaultId: 0,
        noLink: true,
      });
    },
  });
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
      checkUpdates: () => {
        void checkForUpdatesManual();
      },
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

import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  BrowserWindow,
  Menu,
  app,
  dialog,
  shell,
  type MenuItemConstructorOptions,
} from "electron";
import { resolveDbPath } from "./paths.js";
import { resolveRendererConfig } from "./resolveRendererConfig.js";
import { createServerHandle } from "./serverHandle.js";

const SHUTDOWN_TIMEOUT_MS = 5_000;

const isDev = !app.isPackaged;
const { loadProdRenderer, corsOrigin } = resolveRendererConfig(
  app.isPackaged,
  process.env
);

const serverHandle = createServerHandle({ isDev, corsOrigin });

let mainWindow: BrowserWindow | null = null;
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

function buildProdMenu(): Menu {
  const template: MenuItemConstructorOptions[] = [
    { label: "File", submenu: [{ role: "quit" }] },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectAll" },
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
    {
      label: "Window",
      submenu: [{ role: "minimize" }, { role: "close" }],
    },
    {
      label: "Help",
      submenu: [{ label: "Horizon", enabled: false }],
    },
  ];
  return Menu.buildFromTemplate(template);
}

async function createWindow(port: number): Promise<void> {
  const preloadPath = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    "preload.js"
  );

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
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
    await mainWindow.loadFile(
      path.join(app.getAppPath(), "dist", "index.html")
    );
  } else {
    await mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools();
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

  if (loadProdRenderer) {
    Menu.setApplicationMenu(buildProdMenu());
  }

  try {
    const { port } = await serverHandle.start();
    await createWindow(port);
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

import path from "node:path";
import { fileURLToPath } from "node:url";
import { app, BrowserWindow } from "electron";
import { createServerHandle } from "./serverHandle.js";

const isDev = !app.isPackaged;
const corsOrigin = isDev ? "http://localhost:5173" : "*";

const serverHandle = createServerHandle({ isDev, corsOrigin });

async function createWindow(port: number): Promise<void> {
  const preloadPath = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    "preload.js"
  );

  const win = new BrowserWindow({
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

  win.once("ready-to-show", () => {
    win.show();
  });

  if (isDev) {
    await win.loadURL("http://localhost:5173");
    win.webContents.openDevTools();
  } else {
    await win.loadFile(path.join(app.getAppPath(), "dist", "index.html"));
  }
}

async function main(): Promise<void> {
  await app.whenReady();
  const { port } = await serverHandle.start();
  await createWindow(port);
}

app.on("window-all-closed", () => {
  app.quit();
});

app.on("before-quit", () => {
  void serverHandle.shutdown();
});

void main();

import type { MenuItemConstructorOptions } from "electron";

/**
 * Callbacks the main process supplies for each actionable menu item, plus the
 * `isDev` flag that gates the developer-only View items. This module is pure —
 * it wires these callbacks into a menu template and contains no Electron
 * dialog, IPC, or `fetch` logic, so it can be unit-tested without launching
 * Electron.
 */
export interface MenuHandlers {
  isDev: boolean;
  settings: () => void;
  backup: () => void;
  restore: () => void;
  startFresh: () => void;
  checkUpdates: () => void;
  about: () => void;
  showDataFolder: () => void;
}

export function buildMenu(
  handlers: MenuHandlers
): MenuItemConstructorOptions[] {
  const viewSubmenu: MenuItemConstructorOptions[] = [
    { role: "resetZoom" },
    { role: "zoomIn" },
    { role: "zoomOut" },
    { type: "separator" },
    { role: "togglefullscreen" },
  ];

  if (handlers.isDev) {
    viewSubmenu.unshift(
      { role: "reload" },
      { role: "toggleDevTools" },
      { type: "separator" }
    );
  }

  return [
    {
      label: "File",
      submenu: [
        {
          label: "Settings…",
          accelerator: "CmdOrCtrl+,",
          click: () => handlers.settings(),
        },
        { type: "separator" },
        {
          label: "Create Backup…",
          accelerator: "CmdOrCtrl+S",
          click: () => handlers.backup(),
        },
        {
          label: "Restore from Backup…",
          click: () => handlers.restore(),
        },
        {
          label: "Start Fresh…",
          click: () => handlers.startFresh(),
        },
        { type: "separator" },
        { label: "Quit", role: "quit", accelerator: "CmdOrCtrl+Q" },
      ],
    },
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
      submenu: viewSubmenu,
    },
    {
      label: "Window",
      submenu: [{ role: "minimize" }, { role: "close" }],
    },
    {
      label: "Help",
      submenu: [
        {
          label: "Check for Updates…",
          click: () => handlers.checkUpdates(),
        },
        { type: "separator" },
        {
          label: "Show Data Folder",
          click: () => handlers.showDataFolder(),
        },
        {
          label: "About Horizon",
          click: () => handlers.about(),
        },
      ],
    },
  ];
}

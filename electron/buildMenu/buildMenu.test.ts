import { describe, expect, it, vi } from "vitest";
import type { MenuItemConstructorOptions } from "electron";

import { buildMenu, type MenuHandlers } from "./buildMenu";

function createHandlers(overrides: Partial<MenuHandlers> = {}): MenuHandlers {
  return {
    isDev: false,
    settings: vi.fn(),
    backup: vi.fn(),
    restore: vi.fn(),
    startFresh: vi.fn(),
    checkUpdates: vi.fn(),
    about: vi.fn(),
    showDataFolder: vi.fn(),
    ...overrides,
  };
}

function topLabels(
  template: MenuItemConstructorOptions[]
): (string | undefined)[] {
  return template.map((item) => item.label);
}

function submenuOf(
  template: MenuItemConstructorOptions[],
  label: string
): MenuItemConstructorOptions[] {
  const top = template.find((item) => item.label === label);
  if (!top) {
    throw new Error(`Top-level menu "${label}" not found`);
  }
  return (top.submenu as MenuItemConstructorOptions[]) ?? [];
}

function itemBy(
  submenu: MenuItemConstructorOptions[],
  label: string
): MenuItemConstructorOptions {
  const item = submenu.find((entry) => entry.label === label);
  if (!item) {
    throw new Error(`Menu item "${label}" not found`);
  }
  return item;
}

function clickItem(item: MenuItemConstructorOptions): void {
  const click = item.click;
  if (!click) {
    throw new Error(`Menu item "${String(item.label)}" has no click handler`);
  }
  (click as unknown as () => void)();
}

function roles(submenu: MenuItemConstructorOptions[]): (string | undefined)[] {
  return submenu.map((item) => item.role);
}

describe("buildMenu", () => {
  describe("top-level structure", () => {
    it("returns the five top-level menus in order", () => {
      const template = buildMenu(createHandlers());

      expect(topLabels(template)).toEqual([
        "File",
        "Edit",
        "View",
        "Window",
        "Help",
      ]);
    });
  });

  describe("File menu", () => {
    it("contains the actionable items and Quit in order", () => {
      const file = submenuOf(buildMenu(createHandlers()), "File");
      const labels = file
        .filter((item) => item.type !== "separator")
        .map((item) => item.label);

      expect(labels).toEqual([
        "Settings…",
        "Create Backup…",
        "Restore from Backup…",
        "Start Fresh…",
        "Quit",
      ]);
    });

    it("binds Settings… to CmdOrCtrl+,", () => {
      const file = submenuOf(buildMenu(createHandlers()), "File");

      expect(itemBy(file, "Settings…").accelerator).toBe("CmdOrCtrl+,");
    });

    it("binds Create Backup… to CmdOrCtrl+S", () => {
      const file = submenuOf(buildMenu(createHandlers()), "File");

      expect(itemBy(file, "Create Backup…").accelerator).toBe("CmdOrCtrl+S");
    });

    it("makes Quit a native quit role bound to CmdOrCtrl+Q", () => {
      const file = submenuOf(buildMenu(createHandlers()), "File");
      const quit = itemBy(file, "Quit");

      expect(quit.role).toBe("quit");
      expect(quit.accelerator).toBe("CmdOrCtrl+Q");
    });

    it("dispatches the settings handler on click", () => {
      const handlers = createHandlers();
      const file = submenuOf(buildMenu(handlers), "File");

      clickItem(itemBy(file, "Settings…"));

      expect(handlers.settings).toHaveBeenCalledTimes(1);
    });

    it("dispatches the backup handler on click", () => {
      const handlers = createHandlers();
      const file = submenuOf(buildMenu(handlers), "File");

      clickItem(itemBy(file, "Create Backup…"));

      expect(handlers.backup).toHaveBeenCalledTimes(1);
    });

    it("dispatches the restore handler on click", () => {
      const handlers = createHandlers();
      const file = submenuOf(buildMenu(handlers), "File");

      clickItem(itemBy(file, "Restore from Backup…"));

      expect(handlers.restore).toHaveBeenCalledTimes(1);
    });

    it("dispatches the startFresh handler on click", () => {
      const handlers = createHandlers();
      const file = submenuOf(buildMenu(handlers), "File");

      clickItem(itemBy(file, "Start Fresh…"));

      expect(handlers.startFresh).toHaveBeenCalledTimes(1);
    });
  });

  describe("Edit menu", () => {
    it("keeps the standard editing roles", () => {
      const edit = submenuOf(buildMenu(createHandlers()), "Edit");

      expect(roles(edit)).toEqual(
        expect.arrayContaining([
          "undo",
          "redo",
          "cut",
          "copy",
          "paste",
          "selectAll",
        ])
      );
    });
  });

  describe("View menu", () => {
    it("keeps zoom and fullscreen roles", () => {
      const view = submenuOf(buildMenu(createHandlers()), "View");

      expect(roles(view)).toEqual(
        expect.arrayContaining([
          "resetZoom",
          "zoomIn",
          "zoomOut",
          "togglefullscreen",
        ])
      );
    });

    it("includes Reload and Toggle DevTools when isDev is true", () => {
      const view = submenuOf(
        buildMenu(createHandlers({ isDev: true })),
        "View"
      );

      expect(roles(view)).toEqual(
        expect.arrayContaining(["reload", "toggleDevTools"])
      );
    });

    it("omits Reload and Toggle DevTools when isDev is false", () => {
      const view = submenuOf(
        buildMenu(createHandlers({ isDev: false })),
        "View"
      );

      expect(roles(view)).not.toContain("reload");
      expect(roles(view)).not.toContain("toggleDevTools");
    });
  });

  describe("Window menu", () => {
    it("keeps the standard window roles", () => {
      const window = submenuOf(buildMenu(createHandlers()), "Window");

      expect(roles(window)).toEqual(
        expect.arrayContaining(["minimize", "close"])
      );
    });
  });

  describe("Help menu", () => {
    it("contains Check for Updates…, Show Data Folder, About Horizon in order", () => {
      const help = submenuOf(buildMenu(createHandlers()), "Help");
      const labels = help
        .filter((item) => item.type !== "separator")
        .map((item) => item.label);

      expect(labels).toEqual([
        "Check for Updates…",
        "Show Data Folder",
        "About Horizon",
      ]);
    });

    it("dispatches the checkUpdates handler on click", () => {
      const handlers = createHandlers();
      const help = submenuOf(buildMenu(handlers), "Help");

      clickItem(itemBy(help, "Check for Updates…"));

      expect(handlers.checkUpdates).toHaveBeenCalledTimes(1);
    });

    it("dispatches the showDataFolder handler on click", () => {
      const handlers = createHandlers();
      const help = submenuOf(buildMenu(handlers), "Help");

      clickItem(itemBy(help, "Show Data Folder"));

      expect(handlers.showDataFolder).toHaveBeenCalledTimes(1);
    });

    it("dispatches the about handler on click", () => {
      const handlers = createHandlers();
      const help = submenuOf(buildMenu(handlers), "Help");

      clickItem(itemBy(help, "About Horizon"));

      expect(handlers.about).toHaveBeenCalledTimes(1);
    });
  });
});

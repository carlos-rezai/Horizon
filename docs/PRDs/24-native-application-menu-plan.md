# Plan: Native Application Menu

> Source PRD: https://github.com/carlos-rezai/horizon/issues/173

Surface Horizon's data and settings capabilities in the Electron native
title-bar menu — Settings, Create Backup, Restore from Backup, Start Fresh,
Check for Updates, Show Data Folder, and About — as a blend of in-app
navigation and genuinely native dialog flows, installed consistently in both
development and production.

## Architectural decisions

Durable decisions that apply across all phases:

- **Menu shape**: New items fold into the existing **File** and **Help**
  menus. **Edit**, **View**, and **Window** keep their standard Electron
  roles. No dedicated top-level "Horizon" menu. Final layout:
  ```
  File   Settings… (Ctrl+,) │ Create Backup… (Ctrl+S) │ Restore from Backup… │ Start Fresh… │ Quit (Ctrl+Q)
  Edit   (standard roles, unchanged)
  View   (zoom + fullscreen) │ Reload + Toggle DevTools (dev-only)
  Window (standard roles, unchanged)
  Help   Check for Updates… │ Show Data Folder │ About Horizon
  ```
- **Menu construction**: A pure module — `buildMenu(handlers)` — returns the
  menu template and contains no Electron dialog or `fetch` logic, only
  structure, so it is unit-tested without launching Electron. The handlers
  interface carries `isDev` plus one callback per actionable item (settings,
  backup, restore, startFresh, checkUpdates, about, showDataFolder). The main
  process supplies concrete implementations and installs the built menu in
  **both** dev and prod (replacing today's prod-only `buildProdMenu`).
- **Main ↔ server split**: The main process never touches SQLite. Native
  backup/restore/reset use **path-based server endpoints**: main shows the
  native dialog to obtain a filesystem path, then calls
  `http://127.0.0.1:{port}` with that path. No byte-streaming through main, no
  renderer involvement in the transfer. Main stores the `port` from the server
  handle's start. These endpoints inherit the existing loopback-only posture.
- **Post-action reload**: After a **restore** or **reset**, main performs a
  full `webContents.reload()`. A **backup** is read-only — no reload.
- **New server endpoints** (`server/src/routes/storage/storage.ts`):
  - `POST /storage/backup-to   { path: string }` → storage `backup` primitive.
  - `POST /storage/restore-from { path: string }` → storage `restore` primitive,
    reusing the existing integrity → future-schema error-message mapping.
  - `POST /storage/reset` → new storage `reset` primitive.
  - The existing `POST /storage/backup` (download) and multipart
    `POST /storage/restore` endpoints **remain** — the in-app StorageCard still
    uses them. Two backup/restore code paths coexist intentionally.
- **New storage primitive**: `reset(): Promise<void>` added to the `Storage`
  interface and implemented in SQLite storage. Mirrors the restore shape —
  close connection, delete the db file + `-wal`/`-shm` sidecars, reopen (which
  re-runs migrations and reseeds default categories), rebuild repos. Result:
  clean-install state (default seeded categories; no accounts, transactions,
  imports, recurring transactions, or import presets). SQLite is the only
  driver, so no cross-driver parity concern.
- **Settings navigation IPC**: A `menu:navigate` channel — main sends the
  target route, the preload bridge exposes a listener on `window.horizon`, and
  a small renderer hook routes to it. Target: `/settings/storage`.
- **Update messaging**: Available/downloading outcomes reuse the existing
  update IPC → in-app banner/snackbar flow. The currently-silent outcomes —
  up-to-date, error, and dev/unpackaged — get native message-box fallbacks.
- **Safety UX**: Restore and Start Fresh each show one native confirmation
  message box defaulting to **Cancel**. No auto-backup-before-destroy flow.

---

## Phase 1: Menu foundation + native info items

**User stories**: 20, 21, 22, 23, 24, 30, 31, 32, 33, 34

### What to build

Replace the prod-only `buildProdMenu` with a pure `buildMenu(handlers)` module
and install the resulting menu in **both** dev and prod. The menu carries the
full top-level structure — File, Edit, View, Window, Help — with Edit and
Window keeping their standard roles and View keeping zoom/fullscreen. File gets
**Quit** (Ctrl+Q). View gains **Reload** and **Toggle DevTools**, present only
when `isDev` is true. Help gains two fully-working native items this phase:
**Show Data Folder** (reveal the database file in Explorer) and **About
Horizon** (a native message box showing the Horizon version plus
Electron/Chromium/Node versions, with an affordance to open the data folder).

The actionable items introduced by later phases (Settings…, Create Backup…,
Restore…, Start Fresh…, Check for Updates…) are present in the template driven
by handler callbacks, but this phase wires only About and Show Data Folder to
real implementations; the rest can dispatch to no-op/placeholder handlers until
their phase lands. This is a complete, demoable slice: a real native menu with
real working info items, installed identically in dev and prod, no server
changes.

### Acceptance criteria

- [ ] `buildMenu(handlers)` is a pure module returning a menu template, with no
      dialog or `fetch` logic, unit-tested for item presence, order,
      accelerators (Ctrl+,, Ctrl+S, Ctrl+Q), and handler dispatch on click.
- [ ] Dev-only View items (Reload, Toggle DevTools) are present when `isDev` is
      true and absent when false — asserted in the unit test both ways.
- [ ] Edit, View, Window standard roles remain functional (undo/redo/cut/copy/
      paste/select-all, zoom, fullscreen, minimize, close).
- [ ] The custom menu is installed as the application menu in **both** dev and
      prod; the raw default Electron menu no longer appears in development.
- [ ] **Show Data Folder** reveals the database file in Explorer.
- [ ] **About Horizon** opens a native message box showing the Horizon version
      and Electron/Chromium/Node versions, with an affordance to open the data
      folder.
- [ ] **Quit** (Ctrl+Q) exits via the existing shutdown handshake so data is
      checkpointed cleanly.

---

## Phase 2: Settings navigation

**User stories**: 1, 2

### What to build

Add **Settings…** (Ctrl+,) to the File menu. Clicking it sends a `menu:navigate`
IPC message from main with the target route; the preload bridge exposes a
listener on `window.horizon`; a small renderer hook subscribes and routes the
app to `/settings/storage`. Opening settings from the menu bar lands on the
existing in-app Settings page with no full reload.

### Acceptance criteria

- [ ] File **Settings…** is bound to **Ctrl+,**.
- [ ] Clicking Settings… (or pressing Ctrl+,) navigates the renderer to
      `/settings/storage`.
- [ ] Navigation is a client-side route change into the existing Settings
      surface — not a window reload.
- [ ] The preload bridge and renderer hook are typed on `window.horizon`
      (no `any`), consistent with the existing updates bridge.

---

## Phase 3: Create Backup

**User stories**: 3, 4, 5, 6, 35, 37, 38

### What to build

Add `POST /storage/backup-to { path }` to the storage routes, calling the
existing `backup` primitive (SQLite online backup API, WAL-safe). Wire File
**Create Backup…** (Ctrl+S): main shows a native Save dialog, then calls the
endpoint with the OS-picked path. On success, a native confirmation; on write
failure (e.g. unwritable location), a native error so the user is never misled
into believing a backup exists. Cancelling the Save dialog does nothing. The
in-app StorageCard download flow (`POST /storage/backup`) is untouched.

### Acceptance criteria

- [ ] `POST /storage/backup-to { path }` writes a WAL-safe backup at the given
      path via the online backup primitive; route-tested for success.
- [ ] File **Create Backup…** is bound to **Ctrl+S** and opens a native Save
      dialog.
- [ ] A successful backup gives visible native confirmation; the file exists at
      the chosen path.
- [ ] A failed write surfaces a native error message rather than reporting
      success.
- [ ] Cancelling the Save dialog is a no-op.
- [ ] The existing `POST /storage/backup` download endpoint and StorageCard
      flow still work.

---

## Phase 4: Restore from Backup

**User stories**: 7, 8, 9, 10, 11, 12, 13, 38

### What to build

Add `POST /storage/restore-from { path }`, calling the existing `restore`
primitive with the OS-picked path and reusing the current integrity →
future-schema error-message mapping. Wire File **Restore from Backup…**: main
shows a native Open dialog, then a native confirmation message box defaulting to
**Cancel**; on confirm, calls the endpoint and, on success, performs a full
`webContents.reload()` so every view reflects restored data. A corrupted source
or a source written by a newer Horizon version is rejected with a clear native
message and the live data is left untouched. Cancelling either the Open dialog
or the confirmation does nothing.

### Acceptance criteria

- [ ] `POST /storage/restore-from { path }` restores from the given path on
      success; route-tested.
- [ ] Restoring a corrupted source is rejected with the integrity message;
      restoring a future-schema source is rejected with the future-schema
      message — both reusing the existing mapping, live data untouched.
- [ ] File **Restore from Backup…** opens a native Open dialog.
- [ ] A native confirmation precedes restore and defaults to **Cancel**, so an
      accidental Enter/Space never overwrites current data.
- [ ] After a successful restore, main fully reloads the window.
- [ ] Cancelling the Open dialog or the confirmation is a no-op.

---

## Phase 5: Start Fresh (reset)

**User stories**: 14, 15, 16, 17, 18, 19, 36

### What to build

Add `reset(): Promise<void>` to the `Storage` interface and implement it in
SQLite storage (close connection → delete db file + `-wal`/`-shm` sidecars →
reopen, re-running migrations and reseeding default categories → rebuild repos).
Add `POST /storage/reset`. Wire File **Start Fresh…**: a well-worded native
confirmation defaulting to **Cancel**; on confirm, calls the endpoint and
performs a full `webContents.reload()` so the app looks like a first launch.
Reset succeeds even on an already-empty database. No auto-backup before the
wipe — Create Backup sits one menu item away.

### Acceptance criteria

- [ ] `reset()` on SQLite storage leaves zero accounts and zero transactions
      while the default seeded categories remain; verified via a real temp-file
      database (not `:memory:`).
- [ ] `reset()` also succeeds on an already-empty database and leaves the
      clean-install state.
- [ ] `POST /storage/reset` returns success; afterward the accounts and
      transactions endpoints report empty while categories return the default
      set — route-tested.
- [ ] File **Start Fresh…** shows a clear native confirmation defaulting to
      **Cancel**.
- [ ] After a confirmed reset, main fully reloads the window.
- [ ] Cancelling the confirmation is a no-op; no accounts/transactions/imports/
      recurring/import-presets remain after a confirmed reset.

---

## Phase 6: Check for Updates

**User stories**: 25, 26, 27, 28, 29

### What to build

Add Help **Check for Updates…** as a manual trigger over the existing
`autoUpdater`. Available/downloading outcomes reuse the existing update IPC →
in-app banner/snackbar flow with no duplication. The currently-silent outcomes
gain native message-box fallbacks: an "up to date" box when already on the
latest version, an error box when the check fails (e.g. offline), and an "only
available in the installed app" notice when running unpackaged/dev. No change to
the automatic startup check or the auto-download preference.

### Acceptance criteria

- [ ] Help **Check for Updates…** manually triggers an update check.
- [ ] An available/downloading update flows through the existing in-app
      banner/snackbar — no new duplicate UI.
- [ ] Being on the latest version shows a native "you're up to date" box.
- [ ] A failed check (e.g. offline) shows a native error box.
- [ ] Running unpackaged/dev shows a native "only available in the installed
      app" notice instead of attempting a real check.
- [ ] The automatic startup update check and auto-download preference are
      unchanged.

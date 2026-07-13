## Problem Statement

I run Horizon as an installed Windows desktop app, but the native title-bar
menu is almost empty — File→Quit, the standard Edit/View/Window roles, and a
dead, disabled "Horizon" item under Help. Everything I actually care about as
a long-term user of my own finance data — knowing where my database lives,
making a backup before I do something risky, restoring from one, checking
whether there's a new version, and (a capability that does not exist anywhere
today) wiping the app back to a clean slate — is either buried inside the
in-app Settings page or missing entirely.

That's not how a native desktop app is supposed to feel. When I reach for the
menu bar to back up my data or check my version, it should be there, with the
keyboard shortcuts and OS-native Save/Open dialogs I expect from a real
Windows application. And on top of the current custom menu only being
installed in packaged builds, in development I get the raw default Electron
menu, which doesn't match what I ship.

## Solution

Give Horizon a real native application menu that surfaces its data and
settings capabilities alongside the conventional File, Edit, View, Window,
and Help menus — without throwing away the rich in-app Settings page that
already exists.

The menu is a deliberate **blend**:

- Items that are fundamentally about _viewing/configuring_ navigate into the
  existing in-app Settings surface (`/settings/storage`).
- Items that are fundamentally _actions on my data_ — Create Backup, Restore
  from Backup, Start Fresh — use genuinely native flows: OS Save/Open
  dialogs, native confirmation message boxes, and a native About box.

Concretely, the menu becomes:

```
File
  Settings…              Ctrl+,     → navigate renderer to /settings/storage
  ─────────
  Create Backup…         Ctrl+S     → native Save dialog → server writes backup to path
  Restore from Backup…              → native Open dialog → confirm → server restores → reload
  Start Fresh…                      → confirm → server resets to clean install → reload
  ─────────
  Quit                   Ctrl+Q
Edit / View / Window                → unchanged (View gains Reload + Toggle DevTools, dev-only)
Help
  Check for Updates…                → existing autoUpdater flow + native fallback dialogs
  Show Data Folder                  → reveal the database file in Explorer
  ─────────
  About Horizon                     → native message box (versions + data folder)
```

Backup, restore, and reset are driven by **path-based server endpoints**: the
main process shows the native dialog, then calls the local Express server with
the OS-picked filesystem path. No bytes stream through the main process, and
the renderer is not involved in the file transfer. After a restore or reset,
the main process reloads the window so I never see stale data. The custom menu
is installed in **both** dev and prod so what I develop against matches what I
ship, with developer-only View items gated behind an `isDev` flag.

A brand-new capability ships with this: **Start Fresh**, which resets Horizon
to the exact state of a clean install — default seeded categories and nothing
else (no accounts, transactions, imports, recurring transactions, or import
presets).

## User Stories

1. As a Horizon user, I want a **Settings…** item in the File menu, so that I
   can jump straight to the in-app Settings page from the menu bar.
2. As a Horizon user, I want **Settings…** bound to **Ctrl+,**, so that I can
   open settings with the conventional shortcut without touching the mouse.
3. As a Horizon user, I want a **Create Backup…** item in the File menu, so
   that I can snapshot my finance database whenever I want.
4. As a Horizon user, I want **Create Backup…** to open a native Save dialog,
   so that I choose exactly where the backup file is written using the OS file
   picker I already know.
5. As a Horizon user, I want **Create Backup…** bound to **Ctrl+S**, so that
   backing up feels like saving in any other desktop app.
6. As a Horizon user, I want the backup written via the SQLite online backup
   API (not a raw serialize), so that the snapshot is safe and consistent even
   while the database is open under WAL.
7. As a Horizon user, I want a **Restore from Backup…** item in the File menu,
   so that I can recover my data from a previous backup file.
8. As a Horizon user, I want **Restore from Backup…** to open a native Open
   dialog, so that I pick the backup file with the OS file picker.
9. As a Horizon user, I want a clear confirmation before a restore proceeds,
   so that I don't overwrite my current data by accident.
10. As a Horizon user, I want the confirmation dialog to default to **Cancel**,
    so that an accidental Enter/Space keypress never destroys my current data.
11. As a Horizon user, I want the window to fully reload after a restore, so
    that every view reflects the restored data with no stale state.
12. As a Horizon user, I want a restore from a corrupted backup file to be
    rejected with a clear message, so that I understand why it failed and my
    live data is left untouched.
13. As a Horizon user, I want a restore from a backup written by a _newer_
    version of Horizon to be rejected with a clear message, so that a
    future-schema file can't silently corrupt my current install.
14. As a Horizon user, I want a **Start Fresh…** item in the File menu, so
    that I can wipe Horizon back to a clean-install state and start over.
15. As a Horizon user, I want **Start Fresh…** to leave the default seeded
    categories in place, so that after a reset I still have the standard
    category set to work with.
16. As a Horizon user, I want **Start Fresh…** to remove all my accounts,
    transactions, imports, recurring transactions, and import presets, so that
    no trace of my previous data remains.
17. As a Horizon user, I want a clear, well-worded confirmation before Start
    Fresh proceeds, defaulting to **Cancel**, so that I can never wipe my data
    with a stray keypress.
18. As a Horizon user, I want the window to fully reload after a reset, so
    that the app looks exactly like a first launch.
19. As a Horizon user, I do **not** expect Horizon to auto-backup before a
    destructive action, because Create Backup sits one click away in the same
    menu and I can take one myself first.
20. As a Horizon user, I want **Quit** in the File menu bound to **Ctrl+Q**,
    so that I can exit conventionally — and I trust the existing shutdown
    handshake still runs so my data is checkpointed cleanly.
21. As a Horizon user, I want the Edit menu (undo/redo/cut/copy/paste/select
    all) to keep working exactly as before, so that text editing is unaffected.
22. As a Horizon user, I want the View menu's zoom and fullscreen controls to
    keep working, so that I can adjust the app's presentation.
23. As a Horizon developer, I want **Reload** and **Toggle DevTools** in the
    View menu **only in development**, so that debugging tools are available
    while I build but never exposed in the shipped app.
24. As a Horizon user, I want the Window menu (minimize/close) to keep working,
    so that window management is unaffected.
25. As a Horizon user, I want a **Check for Updates…** item in the Help menu,
    so that I can manually ask Horizon whether a newer version exists.
26. As a Horizon user, when an update is available or downloading, I want the
    existing in-app banner/snackbar flow to handle it, so that the update
    experience is consistent with automatic checks.
27. As a Horizon user, when I'm already on the latest version, I want a native
    "you're up to date" message box, so that the currently-silent success case
    gives me visible feedback.
28. As a Horizon user, when an update check errors (e.g. offline), I want a
    native error message box, so that I know the check failed rather than
    wondering if anything happened.
29. As a Horizon developer running the unpackaged app, I want Check for Updates
    to show a native "only available in the installed app" notice, so that I'm
    not confused by updater behaviour that only works when packaged.
30. As a Horizon user, I want a **Show Data Folder** item in the Help menu, so
    that I can reveal my database file in Explorer for manual backups or
    inspection.
31. As a Horizon user, I want an **About Horizon** item in the Help menu, so
    that I can see the app version and runtime versions at a glance.
32. As a Horizon user, I want the native About box to show the Horizon version
    plus Electron/Chromium/Node versions and an affordance to open the data
    folder, so that I have everything I'd want for a bug report in one place.
33. As a Horizon user, I want the native menu present in **both** development
    and production, so that the app behaves consistently and I'm not dropped to
    the default Electron menu while a build is in progress.
34. As a Horizon developer, I want the menu template built by a pure,
    unit-tested function, so that item presence, order, accelerators, and
    dev-gating are verified without launching Electron.
35. As a Horizon user, I want the native backup/restore items to coexist with
    the in-app StorageCard's existing download/upload backup flow, so that both
    the menu and the Settings page keep working.
36. As a Horizon user with an empty database, I want Start Fresh to still
    succeed and leave me in the clean-install state, so that resetting is safe
    even when there's little or nothing to remove.
37. As a Horizon user, if a native backup fails to write (e.g. the chosen
    location isn't writable), I want to be told it failed rather than believing
    a backup was created, so that I don't rely on a backup that doesn't exist.
38. As a Horizon user, if I cancel the native Save or Open dialog, I want
    nothing to happen, so that dismissing a picker is always safe.

## Implementation Decisions

**Menu placement and shape**

- The new items fold into the existing **File** and **Help** menus. Edit,
  View, and Window keep their standard roles. There is no dedicated top-level
  "Horizon" menu — less conventional on Windows, and the roadmap anchors on
  File/Help.
- The menu is a **blend**: Settings… and Check for Updates… lean on existing
  in-app surfaces/flows; Create Backup, Restore, Start Fresh, About, and Show
  Data Folder use native dialogs.
- The custom menu is installed in **both** dev and prod. Developer View items
  (Reload, Toggle DevTools) are gated behind an `isDev` flag.

**Menu construction module**

- Menu template construction is extracted into a pure module that takes a
  handlers object and returns a menu template. It contains no Electron dialog
  or `fetch` logic — only structure — so it can be unit-tested in isolation.
- The handlers interface carries `isDev` plus one callback per actionable item
  (settings, backup, restore, start-fresh, check-updates, about, show-data-
  folder). The main process supplies the concrete implementations.
- The main process wires the handlers to native dialogs + local-server calls
  and installs the built menu as the application menu.

**Execution architecture (main ↔ server split)**

- The Express server runs as a separate utility process; the main process
  never touches SQLite directly and reaches storage only over
  `http://127.0.0.1:{port}`. The main process stores the `port` returned by the
  server handle's start.
- Native backup/restore/reset are driven by **path-based server endpoints**.
  The main process shows the native dialog to get a filesystem path, then calls
  the local endpoint with that path. No byte-streaming through main, no
  renderer involvement in the transfer.
- After a **restore** or **reset**, the main process performs a full
  `webContents.reload()` of the window. A **backup** is read-only and does not
  reload.

**New server endpoints** (`server/src/routes/storage/storage.ts`)

- `POST /storage/backup-to  { path: string }` → calls the storage `backup`
  primitive (SQLite online backup API, WAL-safe).
- `POST /storage/restore-from { path: string }` → calls the storage `restore`
  primitive with the path; same integrity and future-schema validation as the
  existing multipart restore route, reusing the existing integrity-error → user
  message mapping.
- `POST /storage/reset` → calls the new `reset` primitive.
- The existing `POST /storage/backup` (download) and multipart
  `POST /storage/restore` endpoints **remain** — the in-app StorageCard still
  uses them. Two backup/restore code paths coexist intentionally.

**New storage primitive — `reset()`**

- A `reset(): Promise<void>` method is added to the `Storage` interface and
  implemented in the SQLite storage. SQLite is currently the only driver, so
  there is no cross-driver parity concern.
- The implementation mirrors the existing restore shape: close the connection,
  delete the database file and its `-wal`/`-shm` sidecars, then reopen the
  connection — which re-runs migrations and reseeds the default categories —
  and rebuild the repositories.
- Result: brand-new-install state — default seeded categories, and **no**
  accounts, transactions, imports, recurring transactions, or import presets.

**Settings navigation IPC**

- The **Settings…** item navigates the renderer via a `menu:navigate` IPC
  channel: main sends the target route, the preload bridge exposes a listener,
  and a small renderer hook routes to it. Navigation targets `/settings/storage`.

**Update messaging**

- Available/downloading outcomes reuse the existing update IPC → in-app
  banner/snackbar flow (no duplication).
- The currently-silent outcomes — up-to-date, error, and dev/unpackaged — get
  native message-box fallbacks.

**Safety UX**

- Restore and Start Fresh each show a single, well-worded native confirmation
  message box that defaults to **Cancel**.
- No auto-backup-before-destroy flow — Create Backup is one menu item away.

## Testing Decisions

- **What makes a good test here:** exercise externally observable behaviour,
  not implementation details. For the storage primitive and routes, assert the
  _effect_ on stored data and the _shape_ of responses; for the menu module,
  assert the _structure_ the function returns given inputs. Avoid asserting on
  private internals or exact SQL.

- **`reset()` primitive** (SQLite storage): after seeding accounts and
  transactions, calling reset leaves zero accounts and zero transactions while
  the default seeded categories remain present. Also verify reset succeeds on
  an already-empty database and leaves the clean-install state. Prior art:
  existing `SqliteStorage.test.ts` restore/backup tests and the storage parity
  spec. Note the in-memory (`:memory:`) database cannot be reset by deleting a
  file — tests for reset should use a real temp-file database, as the
  restore-source tests already do.

- **`POST /storage/reset` route**: returns success and, after the call, the
  accounts/transactions endpoints report empty while categories still return
  the default set. Prior art: existing `storage.test.ts` route tests.

- **`POST /storage/backup-to` and `POST /storage/restore-from` routes**:
  success writes/reads at the given path; restore-from a corrupted source is
  rejected with the integrity message and restore-from a future-schema source
  is rejected with the future-schema message — reusing the existing
  integrity-error → message mapping. Prior art: the existing multipart restore
  route tests.

- **`buildMenu` pure module**: with stubbed handlers, assert item presence and
  order, the accelerators (Ctrl+, / Ctrl+S / Ctrl+Q), that File and Help carry
  the new items, that Edit/View/Window remain, and that developer View items
  (Reload, Toggle DevTools) are present only when `isDev` is true and absent
  when false. Clicking an item invokes the matching handler. This is the
  module the developer most wants covered because it encodes the menu contract
  without needing a running Electron instance.

- Out of test scope: the native dialogs themselves, `webContents.reload()`,
  and Electron/OS interactions — these are thin glue verified manually.

## Out of Scope

- An auto-backup-before-destroy flow for Restore and Start Fresh (Create
  Backup is one click away in the same menu).
- Surgical cache invalidation after restore/reset — a full window reload is
  used deliberately, accepting a brief window flash as the bulletproof choice.
- A dedicated top-level "Horizon" application menu — the new items fold into
  File and Help.
- macOS application-menu conventions — Horizon is Windows-only.
- Removing or reworking the in-app StorageCard's HTTP download/upload backup
  and restore — those endpoints and that UI stay; the native path-based flow is
  additive.
- Any change to the automatic startup update check or the auto-download
  preference — Check for Updates… only adds a manual trigger plus native
  fallback dialogs for the silent outcomes.

## Further Notes

- The two coexisting backup/restore code paths (in-app HTTP download/upload and
  native path-based endpoints) and the intentional redundancy between the
  native About box and the in-app AboutCard are accepted, documented
  trade-offs, not oversights.
- Because `AUTH_DISABLED=1` on the desktop build is safe only due to the
  loopback bind, the new path-based endpoints inherit the same posture — they
  are reachable only from `127.0.0.1`, exactly like the existing storage routes.
- Source of truth: design log `docs/design-logs/24-native-application-menu.md`.
  All eight design questions there are resolved; this PRD carries no open
  branches.

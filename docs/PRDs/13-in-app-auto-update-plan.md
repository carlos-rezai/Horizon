# Plan: In-App Auto-Update

> Source PRD: https://github.com/carlos-rezai/horizon/issues/86

## Architectural decisions

Durable decisions that apply across all phases:

- **IPC channels**: `update:available`, `update:downloaded`, `update:quit-and-install`, `update:download`, `update:get-auto-download`, `update:set-auto-download`, `app:get-version`
- **Preload namespace**: `window.horizon.updates` — all update IPC methods live here; `window.horizon.apiBaseUrl` is unchanged
- **Key models**: `UpdateState = "idle" | "available" | "ready"` — drives all update UI
- **Preferences schema**: `HorizonPreferences { autoDownload: boolean }` (default: `true`) — stored via `electron-store` in the main process only; renderer never imports `electron-store`
- **Release trigger**: push tag matching `v*` — triggers `.github/workflows/release.yml`
- **CI runner**: `windows-latest` — NSIS installer is Windows-only
- **Update verification**: `allowUncheckedUpdates: true` in `electron-builder` config — required because the installer is unsigned

---

## Phase 1: Auto-download happy path

**User stories**: 1, 2, 3, 4, 5, 9

### What to build

Install `electron-updater`. On `app.whenReady`, call `autoUpdater.checkForUpdates()` with `autoDownload: true` (default). Register a no-op error handler so a failed network check is silent. When `update-downloaded` fires in main, forward it to the renderer via `webContents.send`. Register a `quitAndInstall` IPC invoke handler.

Extend the preload bridge with a `window.horizon.updates` namespace exposing `onUpdateDownloaded(cb)` and `quitAndInstall()`.

Build the `Snackbar` component in `components/Snackbar/` — four variants (`info`, `success`, `warning`, `error`), optional action button, close button, fixed to the bottom-right corner of the viewport.

Build `useUpdateStatus` in `features/updates/` — subscribes to `onUpdateDownloaded`, returns `{ state: UpdateState, install() }`. Initial state is `idle`; transitions to `ready` on the downloaded event.

Build `UpdateBanner` in `features/updates/` — renders a success `Snackbar` with "Restart to update" action when state is `ready`; renders nothing when `idle`. Dismiss hides the banner for the session (state remains `ready` so it reappears on next launch).

Wire `<UpdateBanner />` into `AppLayout` so it is visible across all pages.

### Acceptance criteria

- [ ] `electron-updater` is installed and `autoUpdater.checkForUpdates()` is called once on startup
- [ ] A failed update check (no network, GitHub unreachable) produces no visible error — app starts normally
- [ ] When `update-downloaded` fires, the renderer receives the event via IPC and `useUpdateStatus` transitions to `ready`
- [ ] `UpdateBanner` renders a Snackbar with "Restart to update" action when state is `ready`
- [ ] `UpdateBanner` renders nothing when state is `idle`
- [ ] Clicking "Restart to update" invokes `quitAndInstall()` in main
- [ ] Clicking the close button hides the banner for the session
- [ ] `Snackbar` unit tests pass: renders message, calls `onClose`, calls `action.onClick`, omits action button when none provided
- [ ] `useUpdateStatus` unit tests pass: initial state is `idle`, transitions to `ready` on downloaded callback, `install()` calls `quitAndInstall`
- [ ] `UpdateBanner` unit tests pass: nothing when idle, ready Snackbar when ready, hides on close

---

## Phase 2: Settings page redesign + version and toggle UI

**User stories**: 10, 11

### What to build

Redesign `SettingsStoragePage` to match the current Meridian design system — tonal layering, `CardHeader`, consistent spacing. Structure the page as two sections: "Storage" (existing `BackupRestore` / `StorageStatus`) and "Updates" (new `AutoUpdateToggle`). App version display sits at the bottom of the page.

Add an `app:get-version` IPC invoke handler in main that returns `app.getVersion()`. Expose `getAppVersion(): Promise<string>` on the preload bridge under `window.horizon.updates`.

Build `AppVersion` in `features/settings/` — calls `getAppVersion()` on mount and renders the version string.

Build `AutoUpdateToggle` in `features/settings/` — calls `getAutoDownload()` on mount to read the current preference, calls `setAutoDownload(enabled)` on toggle. This component is rendered in the page but the IPC handlers for `getAutoDownload` / `setAutoDownload` are not wired in main until Phase 3; the toggle is inert (always returns `true`) until then.

### Acceptance criteria

- [ ] `SettingsStoragePage` uses Meridian tonal colours, `CardHeader`, and matches the visual language of the redesigned UI
- [ ] The page has two clearly separated sections: Storage and Updates
- [ ] `AppVersion` renders the string from `app.getVersion()` at the bottom of the page
- [ ] `AutoUpdateToggle` renders a toggle in the Updates section
- [ ] `AutoUpdateToggle` unit tests pass: renders checked when `getAutoDownload` resolves `true`, calls `setAutoDownload(false)` when switched off

---

## Phase 3: Manual download mode

**User stories**: 6, 7, 8

### What to build

Install `electron-store`. Create a `HorizonPreferences` store with `{ autoDownload: boolean, default: true }`. Read `autoDownload` before `autoUpdater.checkForUpdates()` and apply it to `autoUpdater.autoDownload`.

Register IPC handlers in main for `update:get-auto-download`, `update:set-auto-download`, `update:download`, and `update:available` (forwarded from `autoUpdater` when `autoDownload` is OFF).

Extend the preload bridge with `getAutoDownload()`, `setAutoDownload(enabled)`, `downloadUpdate()`, and `onUpdateAvailable(cb)`.

Extend `useUpdateStatus` — when `onUpdateAvailable` fires and `autoDownload` is OFF, transition to `available` and expose `download()`. `download()` calls `downloadUpdate()`; the state then transitions to `ready` when `onUpdateDownloaded` fires.

Extend `UpdateBanner` to render a "update available" `Snackbar` with a "Download" action when state is `available`. After "Download" is clicked, the action becomes inactive while the download runs, then the banner transitions to the "ready" state.

`AutoUpdateToggle` (built in Phase 2) is now fully wired — its IPC handlers exist and the preference persists across launches.

### Acceptance criteria

- [ ] `electron-store` persists the `autoDownload` preference across app restarts
- [ ] With `autoDownload: true`, `update-available` does not show the banner; download proceeds silently; banner appears only when `update-downloaded` fires
- [ ] With `autoDownload: false`, `update-available` fires and `useUpdateStatus` transitions to `available`
- [ ] `UpdateBanner` renders "update available" Snackbar with "Download" action when state is `available`
- [ ] Clicking "Download" calls `downloadUpdate()` and begins the silent download
- [ ] After the download completes, the banner transitions to the "ready" state
- [ ] Toggling `AutoUpdateToggle` in Settings persists the new `autoDownload` preference and it survives a restart
- [ ] `useUpdateStatus` unit tests pass: transitions to `available` when `onUpdateAvailable` fires with auto-download OFF, `download()` calls `downloadUpdate`

---

## Phase 4: Release pipeline

**User stories**: 12, 13

### What to build

Add a `repository` field to `package.json`. Extend the `electron-builder` config with `publish: { provider: "github", owner: "<username>", repo: "horizon" }` and `allowUncheckedUpdates: true`.

Write `.github/workflows/release.yml` — trigger on `push` matching `v*` tags, runner `windows-latest`, steps: checkout → setup Node → `npm ci` → build renderer + server + Electron → `electron-builder --publish always`. Uses `GITHUB_TOKEN` (auto-provided for public repos).

The `npm version patch|minor|major` → `git push --follow-tags` sequence now fully triggers the pipeline.

### Acceptance criteria

- [ ] `electron-builder` config has `publish` pointing at the correct GitHub repo and `allowUncheckedUpdates: true`
- [ ] `.github/workflows/release.yml` exists and is triggered by `v*` tag pushes
- [ ] Pushing a `v*` tag causes CI to build the NSIS installer on `windows-latest` and publish it to GitHub Releases
- [ ] The published release contains the NSIS installer and `latest.yml` manifest
- [ ] `npm version patch && git push --follow-tags` is the complete release command

---

## Phase 5: Self-signed certificate (developer setup)

**User stories**: 14

### What to build

Generate a self-signed code-signing certificate via PowerShell `New-SelfSignedCertificate`. Export it as a `.pfx` file. Import the certificate into the Windows Trusted Root Certification Authorities store on the developer's machine.

Configure `electron-builder` `win.certificateFile` and `win.certificatePassword` via local environment variables (never committed). Document the one-time setup steps in the project README under a "Developer setup" section.

### Acceptance criteria

- [ ] Self-signed certificate is imported into the developer machine's Trusted Root store
- [ ] `electron-builder` reads `win.certificateFile` and `win.certificatePassword` from environment variables
- [ ] A locally-built and locally-installed update does not trigger a SmartScreen warning on the developer's machine
- [ ] README documents the one-time PowerShell commands for generating and importing the certificate
- [ ] Certificate files (`.pfx`, `.cer`) are listed in `.gitignore`

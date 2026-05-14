## Problem Statement

The user has no way to discover or install new versions of Horizon from within the app. Every update requires manually visiting GitHub, downloading a new NSIS installer, and running it. Since Horizon is an offline-first desktop app with a single developer/user, this friction is entirely unnecessary — the app should detect, download, and prompt for installation silently and automatically.

## Solution

Integrate `electron-updater` with GitHub Releases so that Horizon checks for a new version once at startup and handles the rest. When a new version is found, it downloads silently in the background (default behaviour) and shows a Snackbar banner when the download is ready. The user clicks "Restart to update" and the new version installs. A user preference controls whether the download is automatic or manual. The Settings page is redesigned as part of this work to match the current Meridian design system and to host the new auto-update toggle and app version display.

## User Stories

1. As a user, I want the app to silently check for a new version every time it starts, so that I never miss a release.
2. As a user, I want updates to download automatically in the background, so that I am not interrupted while working.
3. As a user, I want a banner to appear in the bottom-right corner when a downloaded update is ready, so that I know I can restart to apply it.
4. As a user, I want to click "Restart to update" on the banner and have the app install the update immediately, so that upgrading requires no manual steps.
5. As a user, I want to dismiss the update banner and have it reappear on the next launch, so that I can choose my own moment to restart.
6. As a user, I want to turn off automatic downloading in Settings, so that I control when large background downloads happen.
7. As a user with auto-download OFF, I want to see a banner when an update is detected with a "Download" button, so that I can trigger the download manually.
8. As a user with auto-download OFF, I want to click "Download" on the banner and have the download start silently, with the banner updating when it is ready, so that I am not interrupted during the download itself.
9. As a user, I want the app to fail silently when the update check cannot reach GitHub, so that being offline does not produce an error popup.
10. As a user, I want the Settings page to show the current installed version of the app, so that I can confirm which version I am running.
11. As a user, I want the Settings page to look consistent with the rest of the redesigned UI, so that the app feels complete and coherent.
12. As a developer publishing a release, I want a GitHub Actions workflow to build the NSIS installer on a Windows runner and publish it to GitHub Releases automatically when I push a version tag, so that I do not need to build and upload the installer manually.
13. As a developer, I want `npm version patch/minor/major` to be the single command that bumps the version, commits, tags, and triggers the release pipeline, so that versioning is consistent and repeatable.
14. As a developer, I want the app to bypass SmartScreen on my own machine via a self-signed certificate, so that I can test the full update cycle without a $300-500/year code-signing certificate.

## Implementation Decisions

### Modules

**`components/Snackbar/`** — New reusable component.

- Four variants: `info`, `success`, `warning`, `error` — each with a distinct Meridian background colour.
- Props: `variant`, `message`, optional `action: { label, onClick }`, and `onClose`.
- Positioned `fixed` at the bottom-right corner of the viewport; overlays content, does not push layout.
- Co-located `Snackbar.tsx`, `Snackbar.styles.ts`, `Snackbar.test.tsx`.

**`features/updates/`** — New feature slice.

- `useUpdateStatus` hook — subscribes to IPC update events, returns `{ state: UpdateState, download(), install() }` where `UpdateState` is `"idle" | "available" | "ready"`.
- `UpdateBanner` component — renders the correct Snackbar variant and message for the current Update State; wired into `AppLayout`.
- `index.ts` barrel export.

**`AppLayout`** — Modified.

- Renders `<UpdateBanner />` — the sole update UI entry point; visible across all pages.

**`features/settings/`** — Two new components added to the existing feature slice.

- `AutoUpdateToggle` — reads the current `autoDownload` preference via IPC, writes changes back; shown in the Settings page "Updates" section.
- `AppVersion` — reads the installed version string via an IPC invoke; shown at the bottom of the Settings page.

**`pages/SettingsStoragePage/`** — Redesigned.

- Visual refresh to match current Meridian design tokens (MD3 palette, tonal layering, CardHeader).
- Two sections: "Storage" (existing BackupRestore functionality) and "Updates" (new `AutoUpdateToggle`).
- App version display at the bottom of the page.

**`electron/preload.ts`** — Extended.

- Adds `window.horizon.updates` namespace with: `onUpdateAvailable(cb)`, `onUpdateDownloaded(cb)`, `quitAndInstall()`, `downloadUpdate()`, `getAutoDownload()`, `setAutoDownload(enabled)`.

**`electron/main.ts`** — Extended.

- Adds `electron-store` with `HorizonPreferences` schema (`{ autoDownload: boolean, default: true }`).
- Reads `autoDownload` preference and sets `autoUpdater.autoDownload` before calling `autoUpdater.checkForUpdates()` on `app.whenReady`.
- Registers `update-available` and `update-downloaded` listeners on `autoUpdater`; forwards them to the Renderer via `webContents.send`.
- Handles `quitAndInstall` and `downloadUpdate` IPC invokes from the Renderer.
- Handles `getAutoDownload` / `setAutoDownload` IPC invokes, reading/writing `electron-store`.

**`electron-builder` config** — Extended.

- Adds `publish: { provider: "github", owner: "<username>", repo: "horizon" }`.
- Adds `allowUncheckedUpdates: true` (no code-signing certificate required for update verification).
- `package.json` `repository` field added.

**`.github/workflows/release.yml`** — New.

- Trigger: `push` matching tag `v*`.
- Runner: `windows-latest`.
- Steps: checkout → setup Node → `npm ci` → build (renderer + server + Electron) → `electron-builder --publish always`.
- Auth: `GITHUB_TOKEN` (auto-provided; repository will be public so no extra secrets needed).

### IPC contract

`window.horizon.updates` methods (added to Preload Bridge):

- `onUpdateAvailable(cb: () => void): void` — registers a one-time listener for the `update-available` main-process event.
- `onUpdateDownloaded(cb: () => void): void` — registers a one-time listener for the `update-downloaded` main-process event.
- `quitAndInstall(): void` — invokes `autoUpdater.quitAndInstall()` in main.
- `downloadUpdate(): void` — invokes `autoUpdater.downloadUpdate()` in main (used when auto-download is OFF).
- `getAutoDownload(): Promise<boolean>` — reads the preference from `electron-store`.
- `setAutoDownload(enabled: boolean): Promise<void>` — writes the preference to `electron-store`.

### HorizonPreferences schema

```ts
interface HorizonPreferences {
  autoDownload: boolean; // default: true
}
```

Stored via `electron-store`; read by Electron Main before `autoUpdater.checkForUpdates()`.

### Update State machine

- Initial state: `idle`.
- `update-available` event (auto-download OFF) → `available`; Update Banner shows "available" message with "Download" action.
- `update-available` event (auto-download ON) → stays `idle` (download starts silently); no banner yet.
- `update-downloaded` event → `ready`; Update Banner shows "ready" message with "Restart to update" action.
- Dismiss → banner hidden for this session; state unchanged (banner reappears on next launch if state is still non-idle at launch).

### Release flow

1. `npm version patch|minor|major` — bumps version in `package.json`, commits, creates `v*` tag.
2. Push with follow-tags — triggers `.github/workflows/release.yml`.
3. CI builds on `windows-latest` and publishes the NSIS Installer + `latest.yml` manifest to GitHub Releases.
4. `electron-updater` reads `latest.yml` at next app startup to detect the new version.

### Self-signed certificate (developer one-time setup)

1. Generate certificate via PowerShell `New-SelfSignedCertificate`.
2. Export as `.pfx` and import into the Windows Trusted Root Certification Authorities store.
3. Configure `electron-builder` `win.certificateFile` and `win.certificatePassword` (local env vars only, not committed).
4. Result: SmartScreen bypassed permanently on the developer's machine; other machines still see the SmartScreen warning (accepted trade-off, documented in README).

## Testing Decisions

**What makes a good test:** Tests verify external behaviour observable from outside the module — props rendered, callbacks invoked, state transitions — never implementation details like internal variable names or private methods.

**`components/Snackbar/` — unit tests**

- Renders the correct message for each variant.
- Calls `onClose` when the close button is clicked.
- Calls `action.onClick` when the action button is clicked.
- Does not render an action button when `action` is not provided.
- Prior art: `CardHeader.test.tsx`, `Card.test.tsx`.

**`features/updates/useUpdateStatus` — unit tests**

- Returns `idle` initially.
- Transitions to `available` when the `onUpdateAvailable` callback fires and auto-download is OFF.
- Transitions to `ready` when the `onUpdateDownloaded` callback fires.
- `download()` calls `window.horizon.updates.downloadUpdate`.
- `install()` calls `window.horizon.updates.quitAndInstall`.
- Prior art: `useStorageStatus.test.ts`.

**`features/updates/UpdateBanner` — unit tests**

- Renders nothing when state is `idle`.
- Renders the "available" Snackbar with "Download" action when state is `available`.
- Renders the "ready" Snackbar with "Restart to update" action when state is `ready`.
- Closes (hides) when the close button is clicked.
- Prior art: `StorageStatus.test.tsx`.

**`features/settings/AutoUpdateToggle` — unit tests**

- Renders a checked toggle when `getAutoDownload` resolves `true`.
- Calls `setAutoDownload(false)` when the toggle is switched off.
- Prior art: `StorageStatus.test.tsx`.

**Modules not unit-tested:** `electron/main.ts` additions (Electron integration — integration-tested at the E2E level during manual smoke testing), `pages/SettingsStoragePage/` (composition only, no logic — no tests beyond the existing page-level render smoke test).

## Out of Scope

- Release channels (alpha/beta) — single developer, not needed.
- Update progress bar — download is silent; progress UI adds complexity for no user value.
- Rollback — not supported by the `electron-updater` NSIS flow.
- Update check on a recurring timer — startup-only is sufficient given the developer publishes releases themselves.
- Error Snackbar on update-check failure — fail silently; the developer will notice.
- Code-signing via EV certificate — violates the zero-cost constraint.
- Multi-machine SmartScreen bypass — the self-signed cert covers the developer's machine only.

## Further Notes

- The `allowUncheckedUpdates: true` flag in `electron-builder` config is required because the NSIS installer is unsigned. Without it, `electron-updater` would refuse to apply the downloaded update.
- `electron-store` is a main-process dependency only; the Renderer never imports it — preferences flow via the Preload Bridge.
- The Snackbar component is intentionally general-purpose; this feature is its first consumer, but it is available to future features (error states, operation confirmations).
- The Settings page redesign is bundled into this issue because the Settings page is the natural home for the auto-update preference, and the current page uses outdated styling. Redesigning it separately would create intermediate visual inconsistency.
- The GitHub repository must be made public before the release workflow will work without a `GH_TOKEN` secret.

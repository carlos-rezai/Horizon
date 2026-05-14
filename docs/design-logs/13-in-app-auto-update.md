# 13 — In-App Auto-Update

## Background

Horizon is packaged as a Windows desktop app via `electron-builder` (NSIS installer). There is no existing update mechanism — users would have to manually download new installers from GitHub. The roadmap item calls for `electron-updater` + GitHub Releases with an in-app banner. The app has a single user (the developer), is offline-first, and must remain zero-cost.

Current state: no `electron-updater` dependency, no `repository` field in `package.json`, no IPC beyond `horizon.apiBaseUrl`, no user preferences layer, no `electron-store`. The settings page (`SettingsStoragePage`) uses the old design and only covers storage status.

## Problem

How should Horizon detect, download, and prompt the user to install new versions — without cloud costs, without a code-signing certificate, and without breaking the offline-first, single-user model?

## Questions and Answers

**Q: Will the GitHub repository be public?**
Yes — currently private, will be made public. No `GH_TOKEN` needed at runtime.

**Q: Do you have a Windows code-signing certificate?**
No. Use `allowUncheckedUpdates: true`. For the developer's own machine, a self-signed cert imported into Trusted Root Certification Authorities bypasses SmartScreen at zero cost (one-time setup).

**Q: When should the app check for updates?**
Once at startup only. The developer always knows when a release is out since they publish it.

**Q: Should the update download automatically in the background?**
Yes — auto-download silently, then show a Snackbar when ready to install. This is the default behaviour.

**Q: Should there be a toggle for auto-download?**
Yes — in settings, default ON. When OFF, the Snackbar appears on detection with a "Download" button instead.

**Q: Where does the auto-download preference live?**
`electron-store` — main-process readable before `autoUpdater` starts, IPC-exposed to renderer.

**Q: What should the update Snackbar show?**
Two states:

- Ready to install: "A new version of Horizon is ready." + [Restart to update] + close
- Available (download OFF): "A new version of Horizon is available." + [Download] + close
  No version numbers in the message. Dismiss is session-only (reappears on next launch if still pending).

**Q: Where in the layout does the Snackbar render?**
Fixed position, bottom-right corner of the viewport. `AppLayout` owns it, fed by `useUpdateStatus`.

**Q: How does update state flow from main to renderer?**
Push via IPC events. Main fires `update-available` and `update-downloaded`. Preload exposes listener registration + `quitAndInstall` + `downloadUpdate` invokes.

**Q: Should the Snackbar be reusable?**
Yes — `components/Snackbar/` with four variants (info, success, warning, error), each with a distinct background colour from the Meridian palette. Close button top-right, optional action button. Used by update feature first; available to all features thereafter.

**Q: How are new releases published?**
GitHub Actions triggered by a version tag. `npm version patch/minor/major` bumps `package.json`, commits, and creates the tag atomically. `git push --follow-tags` triggers the CI workflow which builds the NSIS installer on a Windows runner and publishes to GitHub Releases.

**Q: What if the update check fails?**
Fail silently — no error Snackbar. The developer will know if something is wrong.

**Q: Where should the current app version be shown?**
Settings page — bottom of the page. Keeps the sidebar nav clean.

**Q: Should the settings page be redesigned?**
Yes — full redesign to match the new UI design system, done as part of this feature.

## Design

### Snackbar Component

```
src/components/Snackbar/
  Snackbar.tsx
  Snackbar.test.tsx
  Snackbar.styles.ts
```

```ts
type SnackbarVariant = "info" | "success" | "warning" | "error";

interface SnackbarProps {
  variant: SnackbarVariant;
  message: string;
  action?: { label: string; onClick: () => void };
  onClose: () => void;
}
```

Position: `position: fixed; bottom: spacing; right: spacing;` — overlays content, does not push layout.

### IPC Surface

**`electron/preload.ts` additions:**

```ts
horizon.updates.onUpdateAvailable(callback: () => void): void
horizon.updates.onUpdateDownloaded(callback: () => void): void
horizon.updates.quitAndInstall(): void
horizon.updates.downloadUpdate(): void
horizon.updates.getAutoDownload(): boolean
horizon.updates.setAutoDownload(enabled: boolean): void
```

**`electron/main.ts` additions:**

- `autoUpdater.checkForUpdates()` on `app.whenReady`
- Listeners for `update-available` and `update-downloaded` → forward to renderer via `webContents.send`
- `autoUpdater.autoDownload` set from `electron-store` preference before check

### Update Feature

```
src/features/updates/
  useUpdateStatus.ts   ← subscribes to IPC events, returns { state, download, install }
  UpdateBanner.tsx     ← renders Snackbar with correct message/action for current state
  index.ts
```

`UpdateState`: `"idle" | "available" | "ready"`

### Settings Page

```
src/features/settings/
  AutoUpdateToggle.tsx  ← reads/writes autoDownload via IPC
  AppVersion.tsx        ← reads app version via existing or new IPC invoke
```

`SettingsStoragePage` redesigned to match new UI system. "Updates" section added with `AutoUpdateToggle`. App version shown at page bottom.

### electron-store Schema

```ts
interface HorizonPreferences {
  autoDownload: boolean; // default: true
}
```

### electron-builder Config Additions

```json
"publish": {
  "provider": "github",
  "owner": "<github-username>",
  "repo": "horizon"
},
"allowUncheckedUpdates": true
```

`repository` field added to `package.json`.

### GitHub Actions Workflow

```
.github/workflows/release.yml
```

- Trigger: `push` with tag matching `v*`
- Runner: `windows-latest`
- Steps: checkout → setup Node → install deps → build (renderer + server + electron) → `electron-builder --publish always`
- Auth: `GITHUB_TOKEN` (auto-provided, no extra secrets)

### Self-Signed Cert Setup (documented in PRD)

One-time developer setup to bypass SmartScreen on own machine:

1. `New-SelfSignedCertificate` via PowerShell
2. Export `.pfx` and import into Trusted Root Certification Authorities
3. Configure `electron-builder` `win.certificateFile` + `win.certificatePassword`

✅ Self-signed cert + Trusted Root import — zero cost, bypasses SmartScreen on own machine  
❌ EV certificate — $300–500/year, violates zero-cost requirement  
❌ No cert at all — SmartScreen prompts on every update install

## Implementation Plan

**Phase 1 — Snackbar component**
Build `components/Snackbar/` with all four variants. Render a hardcoded instance in `AppLayout` to validate positioning and visual design. Write tests.

**Phase 2 — IPC + electron-store + update wiring**
Add `electron-store`, wire `autoUpdater` in `main.ts`, expand preload. Implement `useUpdateStatus` hook and `UpdateBanner` feature component. Replace hardcoded Snackbar in `AppLayout` with live `UpdateBanner`.

**Phase 3 — Settings page redesign**
Redesign `SettingsStoragePage` to match new UI system. Add "Updates" section with `AutoUpdateToggle`. Add app version at page bottom.

**Phase 4 — GitHub Actions release workflow**
Write `.github/workflows/release.yml`. Add `publish` config to `electron-builder`. Add `repository` field to `package.json`. Document self-signed cert setup and `npm version` release flow in PRD.

**Phase 5 — Self-signed cert**
Generate cert, configure `electron-builder` signing, import to Trusted Root. Smoke-test a full update cycle end-to-end.

## Trade-offs

**Easier:** Zero-cost, no cloud dependency, reproducible builds via CI, reusable Snackbar for future notifications.

**Harder:** Self-signed cert setup is a manual one-time step; other machines still see SmartScreen (acceptable — single user).

**Out of scope:**

- Release channels (alpha/beta) — single developer, not needed
- Update progress bar — download is silent; progress UI adds complexity for no user benefit
- Rollback — not supported by `electron-updater` NSIS flow

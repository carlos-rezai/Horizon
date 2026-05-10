## Problem Statement

Horizon's Electron shell is complete and fully functional in development, but the app can only be run from source. There is no way to install it as native Windows software — no installer, no Start Menu entry, no versioned release artifact. Every run requires a terminal, Node.js, and the full repo checked out. This is a barrier to actually using Horizon as a daily tool and makes it impossible to share as a portfolio demonstration.

## Solution

Add a Windows packaging pipeline using `electron-builder` that produces a versioned NSIS installer. The installer requires no admin rights, installs per-user with one click, and can be attached to a GitHub Release with changelog notes. A single `npm run release` command drives the whole build from source to installer.

## User Stories

1. As a developer, I want to run `npm run release` and have a Windows installer appear in `release/`, so I do not have to manually coordinate multiple build steps.
2. As a user, I want to install Horizon by double-clicking an installer, so I do not need Node.js, a terminal, or the repo on my machine.
3. As a user, I want the installer to complete without a UAC prompt or admin password, so installation is frictionless.
4. As a user, I want Horizon to appear in my Start Menu after installation, so I can launch it like any other app.
5. As a user, I want Horizon to appear in Add/Remove Programs, so I can uninstall it cleanly.
6. As a user, I want my financial data to survive reinstallation, so upgrading to a new version does not erase my history.
7. As a user, I want the app to launch and connect to its embedded server without any manual setup, so the packaged app is fully self-contained.
8. As a developer, I want to bump the version in one place (`package.json`) and have that version flow automatically into the installer filename and About screen.
9. As a GitHub visitor, I want to download a versioned installer from a GitHub Release, so I know exactly which version I am installing.
10. As a GitHub visitor, I want to read a changelog alongside each release, so I know what changed between versions.
11. As a security-conscious user, I want the embedded HTTP server to be reachable only from my own machine, so no one on my local network or a remote attacker can query my financial data.
12. As a developer, I want the installer filename to carry the version number (e.g. `Horizon-Setup-0.1.0.exe`), so release artifacts are unambiguous.
13. As a developer, I want the `release/` directory to be gitignored, so multi-GB installer files are never accidentally committed.
14. As a developer, I want the server to be compiled to a single bundled file for packaging, so the installed app does not require shipping `node_modules` wholesale.
15. As a developer, I want `better-sqlite3`'s native binary to be correctly extracted outside the ASAR archive, so the packaged app can load it at runtime.
16. As a first-time installer user, I want to understand that a Windows SmartScreen warning may appear and how to dismiss it, so I am not alarmed by a security dialog.

## Implementation Decisions

### Packaging tool

`electron-builder` is the chosen packaging tool. It natively supports NSIS installers, handles `asarUnpack` for native `.node` binaries (required by `better-sqlite3`), and integrates cleanly with existing npm scripts.

### Server bundling strategy

The Express server is currently compiled from TypeScript to JavaScript using `tsc`. For packaging, a new `server:bundle` script compiles the server to a single self-contained file using `esbuild`. `better-sqlite3` is marked as an external dependency in the esbuild config so its native binary is not inlined and can be correctly handled by `asarUnpack`. Migration SQL files are copied alongside the bundle as they are loaded at runtime and cannot be inlined.

### ASAR and native modules

All JS and asset files are packaged into an ASAR archive. Native `.node` binaries (from `better-sqlite3`) cannot be loaded from inside an ASAR archive — `asarUnpack: ["**/*.node"]` extracts them to a sibling directory that Electron's module resolver transparently redirects to at runtime.

### electron-builder configuration

The `build` configuration block is added to `package.json` (not a separate config file). Key settings:

- `appId`: `io.github.carlosrezai.horizon`
- `productName`: `Horizon`
- Output directory: `release/`
- Windows target: NSIS, x64 only
- Install mode: `oneClick: true`, `perMachine: false` (per-user, no UAC)
- Icon: placeholder `.ico` file in `src/assets/`; replaced during the UI redesign

### Security invariant

The Express server already binds to `127.0.0.1` explicitly — this is already correct. This binding is a security invariant and must never be changed to `0.0.0.0`. It applies equally to dev and packaged builds. The invariant is verified as part of this feature and documented clearly in the codebase.

### Release script

A new `release` npm script orchestrates the full build pipeline in the correct order: Vite renderer build, server bundle, preload compile, electron-builder packaging. This is the single command a developer runs to produce a distributable installer.

### Server entry resolution in packaged builds

The `serverHandle` module must correctly resolve the server bundle entry point when the app is running from an installed package (inside an ASAR). The resolution logic must distinguish between dev mode (TypeScript source) and packaged mode (bundled output inside `resources/app.asar`).

### Version

`package.json` version is bumped from `0.0.0` to `0.1.0` as part of this feature. `0.1.0` reflects a functional but pre-redesign state. `1.0.0` is reserved for the post-redesign milestone.

### Gitignore

`release/` is added to `.gitignore`. Installer artifacts are distributed via GitHub Releases, not committed to the repo.

### Placeholder icon

A minimal placeholder `.ico` file is created in `src/assets/` and wired into the electron-builder Windows config. It will be replaced with a designed icon during the upcoming UI redesign feature.

## Testing Decisions

This feature is a build pipeline and infrastructure change. Unit tests are not applicable — the meaningful verification is a full smoke test of the packaged installer.

**Smoke test checklist (manual):**

- `npm run release` completes without errors
- `release/Horizon-Setup-0.1.0.exe` is produced
- Running the installer completes without a UAC prompt
- Horizon appears in the Start Menu and Add/Remove Programs
- The installed app launches without a terminal
- The embedded server starts and the UI loads
- Financial data created in one session persists after closing and reopening
- Uninstalling via Add/Remove Programs removes the app cleanly
- Data directory (`%AppData%\Roaming\Horizon\`) survives uninstall (user data is not deleted)

No automated tests are added for this feature. Future infrastructure tests (e.g. verifying ASAR unpacking) are out of scope.

## Out of Scope

- **Auto-update**: Requires code signing and a release server. Horizon uses manual GitHub Releases.
- **Code signing**: Paid certificate. Violates the zero-cost constraint. The SmartScreen warning is the accepted tradeoff.
- **arm64 build**: Negligible Windows ARM market share. `better-sqlite3` rebuild complexity for a second architecture is not justified.
- **macOS / Linux targets**: Horizon is Windows-only. No other platform targets are planned.
- **Database encryption at rest**: An OS-level concern (BitLocker). Not addressable at the app layer.
- **CI/CD packaging pipeline**: Packaging runs locally. No GitHub Actions or paid CI is introduced.
- **Designed app icon**: Placeholder only. Real icon is part of the upcoming UI redesign feature.
- **Delta/patch updates**: Installers are full installers. No binary diff patching.

## Further Notes

- The SmartScreen warning ("Windows protected your PC") will appear for any user downloading the installer from GitHub because the installer is unsigned. Users dismiss it via "More info > Run anyway". This should be documented in the repo README.
- User data (`horizon.db`) lives in `%AppData%\Roaming\Horizon\` as set by Electron's `app.getPath('userData')`. This path is independent of the install location. Uninstalling the app does not delete user data — correct behaviour for a personal finance tool.
- The first versioned release will be tagged `v0.1.0` on the `main` branch and the installer attached manually to a GitHub Release.

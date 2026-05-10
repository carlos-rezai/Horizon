# Plan: Desktop Packaging

> Source PRD: https://github.com/carlos-rezai/Horizon/issues/73

## Architectural decisions

- **Packaging tool**: `electron-builder` — NSIS target, x64 only, `asarUnpack: ["**/*.node"]` for `better-sqlite3`
- **Install mode**: `oneClick: true`, `perMachine: false` — per-user, no UAC, installs to `%AppData%\Local\Horizon`
- **App identity**: `appId: "io.github.carlosrezai.horizon"`, `productName: "Horizon"`
- **Output directory**: `release/` — gitignored, never committed
- **Server entry**: two distinct compiled paths — `server.js` (tsc, for `electron:start` dev flow) and `server.bundle.js` (esbuild, for packaged builds). `serverHandle` selects via `app.isPackaged`
- **Server bundle**: esbuild with `better-sqlite3` as external; migration SQL files copied alongside
- **Path resolution**: packaged builds use `app.getAppPath()` as base; dev builds continue to use `process.cwd()`
- **Security invariant**: Express server binds to `127.0.0.1` — already implemented, documented as a named constraint
- **Version**: `0.1.0` — first packaged release; `1.0.0` reserved for post-redesign milestone

---

## Phase 1: Foundation — tooling, config, icon, version

**User stories**: 8, 12, 13

### What to build

Install `electron-builder` and establish all static configuration needed before any packaging can run. This phase is config-only — no build pipeline yet.

Add the `build` block to `package.json` with the full electron-builder configuration: app identity, NSIS target, x64 architecture, per-user one-click install, `asarUnpack` for native binaries, and `release/` as the output directory. Wire in the placeholder icon path.

Create a minimal placeholder `.ico` file in `src/assets/`. This is a temporary asset — it will be replaced during the UI redesign feature.

Add `release/` to `.gitignore` so installer artifacts can never be accidentally committed.

Bump `package.json` version from `0.0.0` to `0.1.0`.

### Acceptance criteria

- [ ] `electron-builder` is installed as a dev dependency
- [ ] `package.json` contains a valid `build` config block with `appId`, `productName`, NSIS x64 target, `oneClick: true`, `perMachine: false`, `asarUnpack: ["**/*.node"]`, and `directories.output: "release"`
- [ ] `src/assets/icon.ico` exists (placeholder)
- [ ] `release/` is listed in `.gitignore`
- [ ] `package.json` `version` is `0.1.0`
- [ ] Running `npx electron-builder --version` succeeds

---

## Phase 2: Server bundle — esbuild pipeline and path resolution fix

**User stories**: 7, 14, 15

### What to build

Add a `server:bundle` npm script that compiles the Express server into a single self-contained file using esbuild, with `better-sqlite3` marked as an external dependency. The migration SQL files must be copied alongside the bundle output so they remain accessible at runtime inside the ASAR.

Fix the server entry path resolution in `serverHandle`. The current implementation uses `process.cwd()` as the base path, which is correct in development but undefined in a packaged app. Add a third branch: when `app.isPackaged` is true, resolve the entry using `app.getAppPath()` and point to the esbuild bundle filename. The existing dev paths (`process.cwd()` with `server.js` or `server.ts`) are unchanged — `electron:start` must continue to work without modification.

### Acceptance criteria

- [ ] `npm run server:bundle` produces a single-file bundle in `server/dist/`
- [ ] Migration SQL files are present in `server/dist/` after the bundle script runs
- [ ] `better-sqlite3` is NOT inlined into the bundle (verified by inspecting bundle output or checking that `.node` loading still works)
- [ ] `serverHandle` uses `app.getAppPath()` when `app.isPackaged` is `true`
- [ ] `serverHandle` points to `server.bundle.js` in packaged mode and `server.js` in compiled-dev mode — the two paths are explicitly separated
- [ ] `npm run electron:start` still launches the app correctly (no regression)

---

## Phase 3: Release pipeline — end-to-end packaging, smoke test, and documentation

**User stories**: 1, 2, 3, 4, 5, 6, 9, 10, 11, 16

### What to build

Add a `release` npm script that runs the complete build pipeline in the correct order: native module rebuild, Vite renderer build, server bundle, preload compile, and finally `electron-builder` to produce the NSIS installer. This is the single command a developer runs to go from source to distributable installer.

Run the full smoke test on the produced installer: install, launch, data persistence across sessions, and uninstall. Verify the embedded server starts correctly and the UI loads from the installed location.

Document the SmartScreen warning in the README so users are not alarmed when they first run the installer. Document the `127.0.0.1` binding in the server code as an explicit named security invariant.

### Acceptance criteria

- [ ] `npm run release` completes without errors
- [ ] `release/Horizon-Setup-0.1.0.exe` is produced
- [ ] Running the installer requires no UAC prompt
- [ ] Horizon appears in the Start Menu after installation
- [ ] Horizon appears in Add/Remove Programs after installation
- [ ] The installed app launches without a terminal or Node.js
- [ ] The embedded server starts and the UI loads successfully
- [ ] Data created in one session persists after closing and reopening the installed app
- [ ] Uninstalling via Add/Remove Programs removes the app cleanly
- [ ] `%AppData%\Roaming\Horizon\` (user data directory) survives uninstall
- [ ] README documents the SmartScreen warning and how to dismiss it
- [ ] `127.0.0.1` binding in the server is annotated as a security invariant

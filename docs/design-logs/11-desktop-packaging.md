# 11 — Desktop Packaging

## Background

Horizon is an offline-first personal finance desktop app built on Electron. The Electron dev
environment is fully functional (issue #72), but there is no installer or distribution pipeline.
The app runs from source only. The next step is to produce a real Windows installer so the app
can be installed, run, and versioned like native software.

The project follows a zero-cost principle: no paid services, no code-signing certificates,
no CI/CD infrastructure costs.

## Problem

How do we package Horizon into a distributable Windows installer that:

- Installs cleanly on any Windows x64 machine
- Handles the `better-sqlite3` native module correctly
- Keeps the zero-cost constraint
- Fits a simple manual release workflow (bump version → build → attach to GitHub Release)

## Questions and Answers

**Q: Who is this installer for?**
A: Primarily Carlos on his own machine. Also open for anyone who downloads it from the GitHub
repo as a portfolio reference. It may not fit others' needs but serves as a demonstration.

**Q: Auto-update — should the app check for and download new versions automatically?**
A: No. Each meaningful change (bug fix, design update, new feature) produces a new versioned
installer attached to a GitHub Release with changelog notes. Update by reinstalling.

**Q: Code signing — suppress Windows SmartScreen warning?**
A: No. Zero-cost principle. The SmartScreen "More info → Run anyway" click is the accepted
tradeoff. Documented in the README.

**Q: Architecture target?**
A: x64 only. `better-sqlite3` must be rebuilt per architecture; ARM Windows is a negligible
market share for this use case.

**Q: App icon?**
A: Placeholder icon for the packaging feature. Real icon designed and swapped in during the
upcoming UI redesign feature.

**Q: Install behavior — admin/system or per-user?**
A: Per-user, one-click install (`oneClick: true`). No UAC prompt, no admin rights required.
Installs to `%AppData%\Local\Horizon`.

**Q: Security — what attack surface does a local app with an embedded HTTP server have?**
A: The real risk is the Express server binding. If it listens on `0.0.0.0`, anyone on the local
network (or a remote attacker with lateral access) can reach the financial API without the app.
OS-level remote desktop access exposes the SQLite file regardless — that is a BitLocker problem,
not an app problem. Database encryption at rest is out of scope.

**Q: Should the Express server binding to `127.0.0.1` be an explicit invariant?**
A: Yes. Enforced in server startup code and documented as a security constraint. The server must
never bind to `0.0.0.0` in any build target.

**Q: App identity (appId, productName)?**
A: `appId: "io.github.carlosrezai.horizon"`, `productName: "Horizon"`. userData path remains
`%AppData%\Roaming\Horizon\horizon.db` — unchanged from `electron/paths.ts`.

**Q: Output directory for built installers?**
A: `release/` — separate from Vite's `dist/`, added to `.gitignore` to prevent multi-GB
artifacts from being committed.

**Q: Version workflow?**
A: Manual semver bump in `package.json` + `npm run release` script that builds the installer.
Installer filename carries the version automatically (`Horizon-Setup-0.1.0.exe`).

**Q: Starting version?**
A: `0.1.0` — the app is functional but the UI redesign is still ahead. `1.0.0` is reserved for
when the app feels complete and presentable.

## Design

### Packaging tool

✅ **`electron-builder`** — industry standard, native NSIS support, handles `asarUnpack` for
`.node` binaries, well-documented for `better-sqlite3`.

❌ `electron-forge` — more opinionated scaffold, less flexible for a project already structured.
❌ `electron-packager` — lower-level, no installer generation, requires more glue.

### ASAR and native modules

`better-sqlite3` ships a prebuilt `.node` binary that cannot be loaded from inside an ASAR
archive. electron-builder's `asarUnpack` extracts it alongside the ASAR at packaging time.

```json
"asarUnpack": ["**/*.node"]
```

The server JS bundle (Express + all pure-JS deps) lives inside the ASAR. Only `.node` files
are unpacked.

### Server bundling

The Express server is compiled to a single file via esbuild before packaging. `better-sqlite3`
is marked `external` so it stays as a loadable native module. This mirrors the preload bundling
pattern already in the project.

```
server/dist/server.bundle.js   ← esbuild output, inside ASAR
resources/app.asar.unpacked/   ← .node files extracted here by electron-builder
```

### electron-builder config (in `package.json`)

```json
"build": {
  "appId": "io.github.carlosrezai.horizon",
  "productName": "Horizon",
  "directories": { "output": "release" },
  "files": ["dist/**", "electron/dist/**", "server/dist/**"],
  "asarUnpack": ["**/*.node"],
  "win": {
    "target": [{ "target": "nsis", "arch": ["x64"] }],
    "icon": "src/assets/icon.ico"
  },
  "nsis": {
    "oneClick": true,
    "perMachine": false
  }
}
```

### Security invariant

File: `server/src/index.ts` (or equivalent entrypoint)

```ts
// Security: bind to loopback only — never expose the API on the network
app.listen(port, '127.0.0.1', () => { ... })
```

This is verified at startup regardless of build target (dev or packaged).

### Release script

```json
"scripts": {
  "release": "npm run build && npm run server:build && electron-builder build --win"
}
```

### File layout changes

```
src/assets/
  icon.ico           ← placeholder (replaced during UI redesign)
release/             ← gitignored; installer output
  Horizon-Setup-0.1.0.exe
```

### Version

`package.json` bumped from `0.0.0` → `0.1.0` as part of this feature.

## Implementation Plan

**Phase 1 — Tooling and config**

- Install `electron-builder` as a dev dependency
- Add `build` config block to `package.json`
- Add `release/` to `.gitignore`
- Bump `package.json` version to `0.1.0`

**Phase 2 — Server bundle**

- Add esbuild script to compile `server/src` → `server/dist/server.bundle.js`
- Mark `better-sqlite3` as external in the esbuild config
- Update `electron:start` and `release` scripts to run the new server build step

**Phase 3 — Security invariant**

- Verify Express server binds to `127.0.0.1` explicitly
- Add comment documenting the constraint

**Phase 4 — Icon placeholder**

- Create minimal placeholder `src/assets/icon.ico`
- Wire it into the `electron-builder` win config

**Phase 5 — Smoke test packaging**

- Run `npm run release`
- Verify installer is produced in `release/`
- Install on local machine, confirm app launches and data persists

## Trade-offs

**Easier:** Clean install/uninstall experience; versioned installer filenames; no admin friction
for install; native module handled correctly via asarUnpack.

**Harder:** No auto-update means users must manually download new installers; SmartScreen warning
on first run adds one extra click for anyone downloading from GitHub.

**Explicitly out of scope:**

- Auto-update (requires code signing + release server)
- Code signing (paid certificate, violates zero-cost principle)
- arm64 build (negligible Windows ARM market share)
- Database encryption at rest (OS-level problem — BitLocker)
- macOS / Linux targets (Windows-only personal tool)

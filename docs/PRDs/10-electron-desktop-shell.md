## Problem Statement

Carlos wants to run Horizon as a single offline desktop application on
Windows — no terminal, no `npm run dev`, no separate Vite/server windows.
The frontend and Express server already work as a two-process web app
backed by the SQLite Driver, but there is no shell that bundles them into
one launchable program with a writable data directory under his user
profile. Without that shell, the SQLite Driver shipped in design log 09
has no native producer for `HORIZON_DB_PATH`, the WAL Checkpoint on
shutdown is never guaranteed, and the renderer cannot find the loopback
API on a port that varies from launch to launch.

## Solution

A new top-level `electron/` package that wraps the existing React
frontend and Express server into a single Electron application. Electron
Main owns the BrowserWindow, the Single-Instance Lock, and a Server
Handle that spawns the Express server in a `utilityProcess` child with
`STORAGE_DRIVER=sqlite`, `AUTH_DISABLED=1`, `PORT=0`, and
`HORIZON_DB_PATH` resolved to `app.getPath('userData')/horizon.db`. The
server binds `127.0.0.1`, posts the bound port back as a Ready
Handshake, and the resolved port flows to the Renderer via API Base URL
Injection through a minimal Preload Bridge. On quit, Electron Main sends
a Shutdown Handshake; the child runs `await storage.close()` to trigger
the WAL Checkpoint before exiting.

The Cloud Build is unaffected — `npm run dev` and `npm run server:dev`
keep working untouched. Packaging (`electron-builder`, Windows installer,
code signing) is **not** in scope here; that lands in design log 11.

## User Stories

1. As Carlos, I want to launch Horizon from a single executable, so that
   I can use it day-to-day without running terminal commands.
2. As Carlos, I want the desktop app's database to live under my user
   profile, so that I can locate, copy, or back it up without admin rights.
3. As Carlos, I want only one Horizon window open at a time, so that I
   don't end up with two app instances writing to the same SQLite file.
4. As Carlos, when I double-click the icon while Horizon is already
   running, I want the existing window to come to the front, so that I
   don't have to hunt for it.
5. As Carlos, I want the desktop server to bind only to `127.0.0.1`, so
   that nothing on my LAN can hit my finance data.
6. As Carlos, I want the desktop server to use an ephemeral port, so that
   it never collides with a `npm run server:dev` already running on 3001.
7. As Carlos, I want the Renderer to receive the bound port via the
   Preload Bridge, so that the existing API client keeps working with no
   hardcoded URLs.
8. As Carlos, I want `contextIsolation: true`, `nodeIntegration: false`,
   and `sandbox: true` in the Renderer, so that the React app has no more
   privilege than the Cloud Build SPA.
9. As Carlos, I want the Preload Bridge to expose only
   `window.horizon = { apiBaseUrl, platform: 'electron' }`, so that there
   is exactly one auditable seam between Electron and the React app.
10. As Carlos, I want the desktop app to skip auth (`AUTH_DISABLED=1`),
    so that I'm not logging into my own offline single-user app.
11. As Carlos, I want Electron Main to wait for the Ready Handshake
    before opening the BrowserWindow, so that I never see a flash of
    broken UI while the server is still booting.
12. As Carlos, if the Ready Handshake doesn't arrive within 10 seconds,
    I want a fatal dialog and a clean quit, so that a hung server
    surfaces loudly instead of leaving me staring at a blank screen.
13. As Carlos, when I quit Horizon, I want the WAL Checkpoint to run
    before the process exits, so that my `.db` file is the canonical
    snapshot and Online Backup keeps working.
14. As Carlos, I want a 5-second grace period on the Shutdown Handshake
    followed by a `kill()`, so that a wedged server child can never
    block the app from exiting.
15. As Carlos, when the SQLite Driver throws a `StorageIntegrityError`
    at startup, I want a modal with **Quit** and **Show data folder**
    buttons, so that I can locate the file and decide what to do — never
    a silent recovery.
16. As Carlos, when any other unhandled startup error occurs in the
    Server Handle's child, I want a fatal dialog with `kind: 'unknown'`
    and the error message, so that I'm not left with a blank window.
17. As Carlos, in dev I want to launch `electron:dev` and see the React
    app load with HMR via the Vite dev server, so that I keep the same
    feedback loop I have today.
18. As Carlos, in dev I want the Server Handle's child to stream stdout
    and stderr back to Electron Main's terminal tagged `[server]`, so
    that I can debug server logs without leaving the launching shell.
19. As Carlos, I want `electron:start` to chain `npm run build &&
electron:build` and run against the built renderer, so that I can
    exercise the production code path locally before packaging lands.
20. As Carlos, I want Electron Main written in TypeScript and compiled
    via a dedicated `electron/tsconfig.json`, so that the main process
    is type-safe alongside the rest of the codebase.
21. As Carlos, I want `electron/dist/` gitignored, so that compiled
    artefacts never end up in version control.
22. As Carlos, in dev I want `tsx watch electron/main.ts` to run the
    main process directly, so that there is no compile step in the dev
    inner loop.
23. As Carlos, I want the existing `npm run dev` and `npm run
server:dev` scripts to keep working untouched, so that the Cloud
    Build path remains the supported workflow for that target.
24. As Carlos, I want the API client at `src/utils/api.ts` to prefer
    `window.horizon?.apiBaseUrl` and fall back to
    `import.meta.env.VITE_API_BASE_URL`, so that one code path serves
    both Build Targets.
25. As Carlos, I want a `Window.horizon` global declared in
    `src/types/horizon.d.ts`, so that TypeScript stops complaining when
    `window.horizon` is read from the React app.
26. As Carlos, in dev I want CORS configured to allow the Vite dev
    server origin (`http://localhost:5173`), and in prod I want
    `CORS_ORIGIN=*` because the Renderer loads from `file://`, so that
    requests to the loopback server always succeed.
27. As Carlos, I want exactly one BrowserWindow at 1280×800 with
    `show: false` until `ready-to-show`, so that I never see a white
    flash on launch.
28. As Carlos, I want DevTools to open automatically in dev only, so
    that production launches stay clean.
29. As Carlos, I want default Electron application menus in dev and a
    minimal File / Edit / View / Window / Help menu in prod, so that I
    have keyboard shortcuts (copy/paste, zoom, reload-in-dev) without
    bespoke menu work this slice.
30. As Carlos, I want the SQLite Driver to remain free of any Electron
    imports, so that the seam established in design log 09 Q2 is
    preserved and the driver stays unit-testable in isolation.
31. As Carlos, I want Electron Main to be the only producer of
    `HORIZON_DB_PATH` in the Desktop Build, so that the responsibility
    boundary is unambiguous.
32. As Carlos, I want the backups directory under
    `userData/backups/` to be created lazily on first backup, so that a
    fresh install doesn't litter the data folder with empty directories.
33. As Carlos, when the main process can't acquire the
    Single-Instance Lock, I want it to focus the existing window via
    the `second-instance` event and exit, so that the second launch
    feels like switching to the running app.

## Implementation Decisions

**Process model and folder structure**

- Express runs in an Electron `utilityProcess.fork()` child — never
  inline, never `child_process.spawn('node', ...)`, never
  `child_process.fork()`.
- New top-level `electron/` package, peer to `server/` and `src/`.
  Contains `main.ts`, `preload.ts`, `serverHandle.ts`, `paths.ts`,
  `tsconfig.json`, and a gitignored `dist/` for `tsc` output.
- `electron/tsconfig.json`: `module: NodeNext`, `target: ES2022`,
  `outDir: ./dist`. Compiled via `tsc -p electron`. No bundler.

**Server-side handshake (delta on `server/src/server.ts`)**

- Bind listener to `127.0.0.1` explicitly via
  `app.listen(PORT, '127.0.0.1', …)`.
- Detect parent port via `process.parentPort != null`. When present:
  capture the bound port from `server.address()`, post
  `{ type: 'ready', port }`, listen for `{ type: 'shutdown' }` and on
  receipt run `await storage.close()` then `process.exit(0)`.
- Fatal errors during `createSqliteStorage` or `createApp` post
  `{ type: 'fatal', kind: 'integrity' | 'unknown', message }` and exit
  non-zero. `StorageIntegrityError` maps to `kind: 'integrity'`; any
  other throw to `kind: 'unknown'`.
- Existing CLI behaviour (no parent port) is unchanged — the Cloud
  Build entrypoint and `npm run server:dev` keep working.

**Module: `server/src/parentPort.ts` (deep module — extracted helper)**

- Encapsulates the parent-port handshake behind three exports:
  `postReady(port: number)`, `postFatal(kind, message)`,
  `onShutdown(handler: () => Promise<void>)`. `server.ts` calls these;
  the helper is unit-testable against a mocked `process.parentPort`.

**Module: `electron/serverHandle.ts` (deep module — utilityProcess wrapper)**

- Public surface: `start(): Promise<{ port: number }>`,
  `shutdown(timeoutMs: number): Promise<void>`,
  `onFatal(handler: (kind, message) => void)`.
- Internally: forks `server.ts` (TS source via tsx-resolvable path in
  dev; compiled `server/dist` path in prod) with env
  `{ STORAGE_DRIVER: 'sqlite', AUTH_DISABLED: '1', PORT: '0',
HORIZON_DB_PATH, CORS_ORIGIN }`. Awaits ready with a 10s timeout.
  Pipes child stdio to main's stdout tagged `[server]`. Routes
  `fatal`/`ready` messages.

**Module: `electron/paths.ts`**

- `resolveDbPath(): string` returns
  `path.join(app.getPath('userData'), 'horizon.db')`. The only place
  in the codebase that reads `app.getPath`.

**Module: `electron/main.ts`**

- Strict startup order: `app.whenReady()` →
  `requestSingleInstanceLock()` (exit if lost; install
  `second-instance` focuser if held) → `serverHandle.start()` (10s
  timeout) → `new BrowserWindow({ show: false, … })` →
  `loadURL('http://localhost:5173')` in dev /
  `loadFile(app.getAppPath() + '/dist/index.html')` in prod →
  `ready-to-show` → `win.show()`.
- BrowserWindow security: `contextIsolation: true`,
  `nodeIntegration: false`, `sandbox: true`, `webSecurity: true`,
  `preload` set to `electron/dist/preload.js`,
  `additionalArguments: ['--api-base-url=http://127.0.0.1:' + port]`.
- `before-quit` handler sends `{ type: 'shutdown' }` to the Server
  Handle's child, awaits exit up to 5s, falls back to `kill()`.
- Fatal handler → `dialog.showMessageBox` with **Quit** and **Show
  data folder** (`shell.showItemInFolder` on the resolved DB path).

**Module: `electron/preload.ts`**

- Reads `--api-base-url=` from `process.argv` and exposes
  `window.horizon = { apiBaseUrl, platform: 'electron' }` via
  `contextBridge.exposeInMainWorld`. Nothing else.

**Module: `src/lib/apiBaseUrl.ts` (new)**

- Pure helper `resolveApiBaseUrl(): string` returning
  `window.horizon?.apiBaseUrl ?? import.meta.env.VITE_API_BASE_URL ??
'http://localhost:3001'`. Replaces the inline expression in
  `src/utils/api.ts` so `API_BASE` flows through the helper.

**Module: `src/types/horizon.d.ts`**

- Global declaration of `Window.horizon` as
  `{ apiBaseUrl: string; platform: 'electron' } | undefined`.

**Scripts (package.json)**

- `electron:build` → `tsc -p electron`
- `electron:dev` →
  `concurrently "vite" "tsx watch electron/main.ts"`
- `electron:start` → `npm run build && npm run electron:build &&
electron electron/dist/main.js`. Renderer is loaded from
  `dist/index.html` regardless of `app.isPackaged` when env
  `HORIZON_FORCE_PROD_RENDERER=1` is set, to exercise the prod path.
- New devDeps: `electron`, `concurrently`.
- Existing `dev`, `server:dev`, `build`, `test`, `lint`, `typecheck`
  scripts are untouched.

**IPC message contracts (Server Handle ↔ Express child)**

- Child → main: `{ type: 'ready', port: number }`,
  `{ type: 'fatal', kind: 'integrity' | 'unknown', message: string }`.
- Main → child: `{ type: 'shutdown' }`.
- No other IPC. The Renderer has no IPC at all — it talks to the
  server over HTTP only.

**Bind address and CORS**

- Server always binds `127.0.0.1` in the Desktop Build — never
  `0.0.0.0`, never a LAN address. The `AUTH_DISABLED=1` decision is
  safe only because of this rule.
- Dev: main passes `CORS_ORIGIN=http://localhost:5173`. Prod: main
  passes `CORS_ORIGIN=*` (Renderer loads from `file://`); safe because
  loopback bind keeps off-box traffic out.

**Auth**

- Server child runs with `AUTH_DISABLED=1`. `app.ts` already
  short-circuits `requireOwner`, helmet, and rate-limiting on that
  flag — no new code in `app.ts`.

## Testing Decisions

A good test here exercises **observable external behaviour** of each
module — the messages it posts, the order of side effects, the public
return values — without coupling to private fields, class names, or
file-system paths beyond what the module exposes. Driver-internal
behaviour (SQLite WAL semantics, Mongo aggregation pipelines) is
already covered by design log 09's Parity Spec and is not retested
here.

**Modules with new tests**

1. **`server/src/parentPort.ts`** — unit tests against a mocked
   `process.parentPort`:
   - `postReady(port)` posts a `{ type: 'ready', port }` message.
   - `postFatal('integrity', msg)` posts a `{ type: 'fatal', kind:
'integrity', message }` message.
   - `onShutdown(handler)` invokes the handler when the parent port
     emits a `{ type: 'shutdown' }` message.
   - The handshake is a no-op when `process.parentPort` is undefined
     (CLI / Cloud Build path).
2. **`src/lib/apiBaseUrl.ts`** — unit tests using a fake `window`:
   - Returns `window.horizon.apiBaseUrl` when set.
   - Falls back to `import.meta.env.VITE_API_BASE_URL` when
     `window.horizon` is undefined.
   - Falls back to `http://localhost:3001` when both are unset.

**Modules covered by smoke tests only**

- **`electron/serverHandle.ts`** — Electron API surface is too heavy
  to mock cleanly for a unit test. Covered by the manual smoke from
  Phase 3 (`electron:dev` launches, account list loads from loopback,
  no CORS errors in console).
- **`electron/main.ts`**, **`electron/preload.ts`**, **`electron/paths.ts`**
  — Electron-runtime-only; covered by smoke launches in dev
  (`electron:dev`) and prod (`electron:start`).

**Prior art for these tests**

- `server/src/storage/__tests__/*.parity.test.ts` — Parity Spec from
  log 09 is the precedent for behaviour-driven storage tests.
- `server/src/storage/sqlite/__tests__/*.test.ts` — driver-level unit
  tests using in-memory SQLite are the precedent for the
  parent-port-helper tests (small, fast, behaviour-focused).
- Frontend `*.test.tsx` files using `@testing-library/react` and
  Vitest's `vi.stubGlobal` are the precedent for the `apiBaseUrl`
  tests with a fake `window`.

## Out of Scope

- **Packaging** — `electron-builder` config, Windows installer, code
  signing, ASAR, NSIS scripts. Lands in design log 11 (Desktop
  Packaging).
- **Daily auto-backup snapshots, backup/restore menu items, optimize-DB
  menu, "Show in Explorer" outside the fatal dialog** — folded into a
  future Desktop Ops design log.
- **Auto-update channel** — out of scope until the app has shipped once.
- **macOS / Linux builds** — Carlos is on Windows; cross-platform is
  opportunistic.
- **IPC beyond the Server Handle handshake** — Renderer talks to the
  server over HTTP, full stop.
- **Custom application menu items** — none yet; default Electron
  menus are fine for this slice.
- **Persistent log file in prod** — premature; revisit when there's a
  reader. Dev streams stdio tagged `[server]`; prod swallows.
- **At-rest encryption (SQLCipher)** — already deferred in log 08,
  unchanged.
- **AI features** (Monthly Digest, Anomaly Detection, Sondertilgung
  Advisor) — sequenced after the desktop shell ships per CLAUDE.md.
- **Google Auth in the Cloud Build** — separate track; the
  `AUTH_DISABLED=1` flag in the Desktop Build does not affect the
  Cloud Build's auth code path.

## Further Notes

- The Desktop Build security model leans entirely on the Loopback
  Bind (`127.0.0.1`) plus the Single-Instance Lock plus the
  one-property Preload Bridge. Removing any of those three breaks the
  rationale for `AUTH_DISABLED=1`.
- The `serverHandle.ts` source-resolution rule (TS source via tsx in
  dev, compiled JS in prod) is the only dual-path branch this slice
  introduces. It is small but noted as a thing to keep straight when
  packaging lands in log 11.
- The Renderer's existing API client at `src/utils/api.ts` is
  upgraded to read through `resolveApiBaseUrl()`. This keeps a single
  code path for both Build Targets — no `if (window.horizon)`
  branching elsewhere in the frontend.
- After this PRD ships, `CLAUDE.md` is updated to:
  - Tick **Electron desktop shell** in Build Status.
  - Note Electron Main as the producer of `HORIZON_DB_PATH` in the
    Desktop Build.
  - Add `electron:build`, `electron:dev`, `electron:start` to the
    Development Workflow section.

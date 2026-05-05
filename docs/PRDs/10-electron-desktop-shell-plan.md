# Plan: Electron Desktop Shell

> Source PRD: https://github.com/carlos-rezai/horizon/issues/66

## Architectural decisions

Durable decisions that apply across all phases:

- **Process model:** Express runs in `utilityProcess.fork()` — never inline, never `child_process.spawn/fork`.
- **IPC contracts:** Child → main: `{ type: 'ready', port }` | `{ type: 'fatal', kind, message }`. Main → child: `{ type: 'shutdown' }`. Renderer has no IPC — HTTP only.
- **Bind address:** Server always binds `127.0.0.1` in the Desktop Build. Never `0.0.0.0`.
- **Port:** Ephemeral (`PORT=0`); resolved port flows to Renderer via Preload Bridge argument `--api-base-url`.
- **Auth:** `AUTH_DISABLED=1` for all Desktop Build launches. Safe only because of the loopback bind.
- **DB path:** `app.getPath('userData')/horizon.db` — `electron/paths.ts` is the sole producer.
- **Security:** `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, `webSecurity: true`.
- **Preload surface:** `window.horizon = { apiBaseUrl, platform: 'electron' }` — nothing else crosses the bridge.
- **Source resolution:** Dev uses tsx-resolvable TS source path; prod uses compiled `server/dist`. Packaging (log 11) keeps this rule.
- **Cloud Build:** `npm run dev` and `npm run server:dev` are never touched.

---

## Phase 1: Frontend wiring

**User stories:** 7, 9, 24, 25

### What to build

A pure frontend change that makes both Build Targets read the API base URL through a single code path. A new `src/lib/apiBaseUrl.ts` helper resolves the URL from `window.horizon.apiBaseUrl` first, then `import.meta.env.VITE_API_BASE_URL`, then a hardcoded fallback. `src/utils/api.ts` is updated to use this helper instead of its inline expression. A `src/types/horizon.d.ts` global declaration gives TypeScript a type for `window.horizon` so the React app can reference it without errors. No Electron code exists yet — this phase just makes the frontend Electron-aware.

### Acceptance criteria

- [ ] `src/lib/apiBaseUrl.ts` exports `resolveApiBaseUrl(): string`
- [ ] `src/lib/apiBaseUrl.test.ts` covers all three resolution paths (horizon set, horizon unset + env set, both unset)
- [ ] `src/utils/api.ts` derives `API_BASE` via `resolveApiBaseUrl()` — no inline expression
- [ ] `src/types/horizon.d.ts` declares `Window['horizon']` as `{ apiBaseUrl: string; platform: 'electron' } | undefined`
- [ ] `npm test` passes
- [ ] `npm run dev` (Cloud Build) still works

---

## Phase 2: Server handshake protocol

**User stories:** 5, 6, 11, 12, 13, 14, 15, 16, 30

### What to build

The server-side half of the Electron IPC protocol, extracted behind a deep module so it stays unit-testable with no Electron imports. `server/src/parentPort.ts` encapsulates the parent-port handshake: `postReady(port)`, `postFatal(kind, message)`, and `onShutdown(handler)`. When `process.parentPort` is absent (Cloud Build / CLI), all three are no-ops. `server/src/server.ts` is updated to bind `127.0.0.1` explicitly, call `parentPort` helpers after startup, and classify fatal errors — `StorageIntegrityError` maps to `kind: 'integrity'`; anything else to `kind: 'unknown'`. Existing Cloud Build behaviour is fully preserved.

### Acceptance criteria

- [ ] `server/src/parentPort.ts` exports `postReady`, `postFatal`, `onShutdown`
- [ ] `postReady` / `postFatal` / `onShutdown` are no-ops when `process.parentPort` is absent
- [ ] Unit tests for all four `parentPort.ts` behaviours (postReady posts correct message, postFatal posts correct message, onShutdown invokes handler on shutdown message, no-op when parentPort absent)
- [ ] `server/src/server.ts` binds `127.0.0.1` explicitly
- [ ] `server/src/server.ts` posts `ready` with bound port after successful startup
- [ ] `server/src/server.ts` posts `fatal` with correct `kind` on `StorageIntegrityError` or unknown throw, then exits non-zero
- [ ] `server/src/server.ts` calls `storage.close()` then `process.exit(0)` on shutdown message
- [ ] `npm test` passes
- [ ] `npm run server:dev` still starts and serves requests on port 3001

---

## Phase 3: Electron shell — dev workflow

**User stories:** 1, 2, 3, 4, 8, 10, 17, 18, 20, 21, 22, 26, 27, 28, 29, 31, 32, 33

### What to build

The full `electron/` package wiring the two previous phases into a launchable application. `electron/paths.ts` owns the sole `app.getPath('userData')` call and returns the `horizon.db` path. `electron/preload.ts` reads `--api-base-url` from `process.argv` and exposes `window.horizon` via `contextBridge` — nothing else. `electron/serverHandle.ts` forks the Express server as a `utilityProcess`, awaits the Ready Handshake with a 10-second timeout, pipes child stdio to main tagged `[server]`, and routes fatal/ready messages. `electron/main.ts` orchestrates the full startup sequence: Single-Instance Lock (second-instance focuser if held, exit if lost), `serverHandle.start()`, BrowserWindow creation with security flags, `loadURL` against the Vite dev server, `ready-to-show` before showing, DevTools in dev only, minimal menus in prod. `before-quit` sends shutdown and awaits up to 5 seconds before `kill()`. Fatal handler shows a `dialog.showMessageBox` with **Quit** and **Show data folder**. `package.json` gains `electron:build` and `electron:dev` scripts plus `electron` and `concurrently` devDeps. `electron/dist/` is gitignored.

### Acceptance criteria

- [ ] `electron/` directory exists with `main.ts`, `preload.ts`, `serverHandle.ts`, `paths.ts`, `tsconfig.json`
- [ ] `electron/tsconfig.json` targets ES2022, module NodeNext, outputs to `./dist`
- [ ] `electron/dist/` is gitignored
- [ ] `npm run electron:build` compiles without errors
- [ ] `npm run electron:dev` launches the application
- [ ] BrowserWindow loads the React app from the Vite dev server; accounts list is visible
- [ ] No CORS errors in DevTools console
- [ ] Server logs appear in the launching terminal tagged `[server]`
- [ ] Launching a second instance focuses the running window and exits cleanly
- [ ] Closing the app triggers the Shutdown Handshake; server exits before the window closes
- [ ] If server startup exceeds 10 seconds, a fatal dialog appears and the app quits cleanly
- [ ] `StorageIntegrityError` at startup shows integrity modal with **Quit** and **Show data folder**
- [ ] Unknown startup error shows fatal modal with the error message
- [ ] `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true` confirmed in BrowserWindow options
- [ ] `window.horizon.apiBaseUrl` is set in the Renderer; `window.horizon.platform === 'electron'`
- [ ] SQLite Driver has no Electron imports
- [ ] `npm run dev` and `npm run server:dev` still work

---

## Phase 4: Production path

**User stories:** 1, 19, 23

### What to build

The `electron:start` script that exercises the full production code path locally before packaging lands. Running `npm run electron:start` chains `npm run build` (Vite renderer build), `npm run electron:build` (tsc compile), then launches Electron pointing at `dist/index.html`. Main detects that `app.isPackaged` is false but `HORIZON_FORCE_PROD_RENDERER=1` is set and loads the file URL instead of the Vite dev server. This validates that the built renderer assets work against the loopback server before an installer is involved.

### Acceptance criteria

- [ ] `electron:start` script added to `package.json`
- [ ] `npm run electron:start` completes build steps and launches without errors
- [ ] Renderer loads from `dist/index.html` (file URL), not `localhost:5173`
- [ ] API calls succeed against the loopback server; no CORS errors
- [ ] Quit triggers WAL Checkpoint (storage.close() completes before process exits)
- [ ] `npm run dev` and `npm run server:dev` remain untouched

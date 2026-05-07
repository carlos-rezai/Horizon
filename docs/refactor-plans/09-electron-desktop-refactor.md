## Problem Statement

The Electron desktop shell shipped through issues #67–#71 with eight follow-up
fix commits required to get `electron:start` working end-to-end. Alongside
that, the project carries a full web/cloud layer — MongoDB, Mongoose, Google
Auth, helmet, rate-limiting, CORS configuration — that was designed for a
deployment that will never happen. The codebase now has two parallel storage
drivers, auth-gating middleware gated behind an `AUTH_DISABLED` escape hatch,
a `STORAGE_DRIVER` env switch that will always be set to `sqlite`, and Electron
IPC wiring that passes a dynamic `CORS_ORIGIN` the server doesn't need.
The result is a repo that tells two stories at once when there is only one story
left to tell.

## Solution

In two coordinated sweeps — first the MongoDB/web-layer purge, then the
Electron shell cleanup — reduce the codebase to a coherent, desktop-only
application. Delete the Mongo storage driver, Mongoose models, auth middleware,
and all web-security middleware. Simplify the server bootstrap, storage factory,
and Electron IPC accordingly. Then address the five structural issues introduced
during the Electron shell implementation: duplicated preload logic, the
`VITE_BUILD_FOR_ELECTRON` env-var hack in Vite config, an inline Node.js
eval in the `server:build` script, a missing preload watch in `electron:dev`,
and the `window.horizon?.platform` conditional in `App.tsx`.

## Commits

### Phase 1 — MongoDB and web-layer purge

**Commit 1 — Delete MongoDB storage driver, Mongoose models, and MongoDB tests**

Simplify `server/src/storage/index.ts` to a single SQLite path: remove the
`driver` parameter from `createStorage`, drop the `"mongo"` branch, and
import only from the SQLite driver. Delete the entire `server/src/storage/mongo/`
directory (seven files), the entire `server/src/models/` directory (five
Mongoose schemas), and all MongoDB-specific test files:
`storage.mongo.test.ts`, the `mongoStorageStub.ts` helper, and the six
`mongo*.test.ts` files in `storage/__tests__/`. These deletions and the
index.ts simplification must land in the same commit because index.ts
imports from the now-deleted folder.

**Commit 2 — Remove auth middleware and web-security layer from app.ts**

Delete `server/src/auth/requireOwner.ts` and its containing directory.
In `app.ts`: remove the `requireOwner` import; remove the `AUTH_DISABLED`
env-var check and both `if (!authDisabled)` guards; remove `helmet` and its
middleware; remove `express-rate-limit` and its middleware; remove
`sanitize5xx` (it existed to hide 5xx detail from anonymous web clients —
harmful in a desktop context where the developer needs real error messages);
always mount `logUnhandledError` as the final middleware. Simplify `cors()`
call to use no options, which defaults the `Access-Control-Allow-Origin`
header to `*` — safe because the server binds to `127.0.0.1` only.
Make `createApp` synchronous: it was async to accommodate the Mongoose
connection handshake, which no longer exists. Update the caller in
`server.ts` accordingly (`const app = createApp(storage)`).

**Commit 3 — Simplify server.ts: always SQLite**

Remove the `STORAGE_DRIVER` env-var check and the `buildStorage` branching
function. Replace with a direct `createStorage({ path: resolveSqlitePath(...),
...resolveSqliteOptions(...) })` call in `main()`. Remove all references to
`MONGODB_URI`. The `resolveSqlitePath` and `resolveSqliteOptions` helpers are
unchanged.

**Commit 4 — Remove dead error branches from the storage route**

In `server/src/routes/storage.ts`: remove the `isUnsupportedDriverError`
helper function (it detected the Mongo driver's "not supported" throw) and its
two call-sites in the `POST /storage/backup` and `POST /storage/restore`
handlers. Remove the `UNSUPPORTED_BACKUP_MESSAGE` and
`UNSUPPORTED_RESTORE_MESSAGE` constants. Multer, backup, and restore logic
are all SQLite features and stay untouched.

**Commit 5 — Uninstall web-layer npm packages**

Remove five packages: `mongoose`, `mongodb-memory-server`,
`google-auth-library`, `helmet`, `express-rate-limit`. The `cors` package
stays (needed for the Electron renderer's cross-origin HTTP requests to the
loopback server). `multer` and `@types/multer` stay (used by the restore
endpoint).

### Phase 2 — Electron IPC simplification

**Commit 6 — Remove CORS_ORIGIN from the Electron IPC chain**

Now that `app.ts` uses `cors()` with no options (always `*`), the dynamic
`CORS_ORIGIN` env var no longer needs to flow from main to the utility
process. In `resolveRendererConfig.ts`: remove the `corsOrigin` field from
`RendererConfig` and its derivation logic. Update `resolveRendererConfig.test.ts`
to remove the `corsOrigin` assertions. In `serverHandle.ts`: remove the
`corsOrigin` field from `ServerHandleOptions` and the `CORS_ORIGIN` key from
the env block passed to `utilityProcess.fork`. In `main.ts`: remove the
destructured `corsOrigin` from the `resolveRendererConfig` call and from the
`createServerHandle` call.

### Phase 3 — Electron shell cleanup

**Commit 7 — Fix preload logic duplication**

`parseApiBaseUrlArg` is currently defined inline in `preload.ts` AND exported
from the standalone `parseApiBaseUrlArg.ts` for testing, because the preload
is compiled as CommonJS and cannot import from the ESM main build. Fix: add
`parseApiBaseUrlArg.ts` to the `include` array in `electron/tsconfig.preload.json`.
The preload build (which runs second in `electron:build`) will compile it to
CJS in `dist/`. Change `preload.ts` to import from `./parseApiBaseUrlArg.js`
and remove the inline definition. The main tsconfig and vitest continue to see
`parseApiBaseUrlArg.ts` as an ESM module for testing. No test changes required.

**Commit 8 — Remove VITE_BUILD_FOR_ELECTRON; always use base "./"**

`vite.config.ts` currently toggles `base: "./"` vs `base: "/"` via a
`VITE_BUILD_FOR_ELECTRON` env var. Relative asset paths (`"./"`) are fully
compatible with HTTP serving from a domain root, so the conditional is
unnecessary. Change `vite.config.ts` to always use `base: "./"` and remove
the `process.env` check. Remove `VITE_BUILD_FOR_ELECTRON` from the
`build:electron` script and merge `build:electron` into `build` (they are
now identical). Update `electron:start` to call `npm run build` instead of
`npm run build:electron`. Remove `cross-env` from this script if it is no
longer used elsewhere; otherwise leave it.

**Commit 9 — Extract migration copy to a script file**

The `server:build` script contains an inline `node --input-type=module -e`
eval to copy SQLite migration files after the TypeScript compile. Extract
this to `scripts/copy-migrations.mjs` (creating the `scripts/` directory).
Update `server:build` to call `node scripts/copy-migrations.mjs` after
`tsc`. The migration copy behaviour is unchanged.

**Commit 10 — Watch the preload in electron:dev**

`electron:dev` currently runs Vite and `tsx watch electron/main.ts` in
parallel. If `preload.ts` or `parseApiBaseUrlArg.ts` are edited, the CJS
preload in `dist/preload.js` goes stale without any rebuild. Add a third
concurrent process to `electron:dev`:
`tsc -p electron/tsconfig.preload.json --watch --preserveWatchOutput`.
This ensures all three compilation targets are watched in development.

**Commit 11 — Always use HashRouter; remove platform conditional**

`App.tsx` currently switches between `HashRouter` and `BrowserRouter` based
on `window.horizon?.platform === "electron"`. With the project committed to
desktop-only, `BrowserRouter` is never needed. Replace the conditional router
with a single `HashRouter` import. Remove the `window.horizon?.platform`
reference from the renderer. The `window.horizon` global (and the
`src/types/horizon.d.ts` declaration) stays, because `apiBaseUrl` is still
read from it by `resolveApiBaseUrl`.

### Phase 4 — Documentation

**Commit 12 — Update CLAUDE.md for desktop-only direction**

Mark the project as desktop-only. Remove `MONGODB_URI`, `GOOGLE_CLIENT_ID`,
`GOOGLE_CLIENT_SECRET`, `CORS_ORIGIN`, `AUTH_DISABLED`, and `STORAGE_DRIVER`
from the Environment Variables section. Remove references to demo vs production
deployment, Google Auth, and Vercel + Render. Update the Build Status checklist
(tick the Electron desktop shell checkbox; note AI features and cloud deployment
are permanently out of scope). Update the scripts table to reflect the merged
`build` script and the new `scripts/copy-migrations.mjs`.

## Decision Document

**Packages removed**
`mongoose`, `mongodb-memory-server`, `google-auth-library`, `helmet`,
`express-rate-limit`. All were web-deployment or Mongo-specific.

**Packages retained**
`cors` — still needed; the Electron renderer (at `file://` or
`http://localhost:5173`) is a different origin from the loopback API server,
and Chromium's CORS policy applies in the sandboxed renderer. The server
switches from dynamic `process.env.CORS_ORIGIN` to `cors()` with no options,
which sets `Access-Control-Allow-Origin: *`. Safe because the server binds
exclusively to `127.0.0.1`.

`multer` + `@types/multer` — the `POST /storage/restore` endpoint accepts a
multipart file upload. This is a SQLite feature (backup/restore) that remains
in scope.

**Storage abstraction retained**
`server/src/storage/Storage.ts` (the interface) and `server/src/storage/index.ts`
(the factory) are kept. The factory's `driver` parameter is removed — it now
always creates a SQLite storage instance — but the interface remains a clean
boundary between routes and storage. Routes reference `Storage`, not
`SqliteStorage`, which keeps the test helpers simple.

**`createApp` becomes synchronous**
The `async` keyword on `createApp` was inherited from the Mongoose connection
handshake. No await points remain. The signature becomes
`createApp(storage: Storage): Express`. The caller in `server.ts` drops the
`await`.

**`sanitize5xx` removed**
This middleware was a web-security measure to prevent leaking stack traces to
anonymous browser clients. For a single-user desktop app where the developer
is the only user, it actively harms debuggability. Removed without replacement.
`logUnhandledError` (which logs to stderr and returns a 500 JSON body) is
always mounted.

**`STORAGE_DRIVER` env var removed**
The env var served the dual-driver switch. With only one driver, it is
removed from `server.ts`. The Electron main process no longer passes it.

**`AUTH_DISABLED` env var removed**
The Electron main passed `AUTH_DISABLED=1` to the utility process to short-
circuit the auth middleware. Auth middleware is now deleted entirely, so the
env var has no consumer.

**`CORS_ORIGIN` removed from Electron IPC**
Previously, `resolveRendererConfig` computed a per-mode CORS origin that
flowed through `serverHandle` into the utility process env. With the server
always using `cors()` default, this entire chain is removed.
`resolveRendererConfig` shrinks to only the `loadProdRenderer: boolean` flag.

**Always HashRouter**
With no web deployment, `BrowserRouter` (which requires the server to return
`index.html` for all routes) is unnecessary. `HashRouter` works identically
for the desktop use case. The `window.horizon?.platform` check in `App.tsx`
is removed. `window.horizon` itself is kept — `apiBaseUrl` still flows
through it.

**`parseApiBaseUrlArg.ts` in both tsconfigs**
The function is pure logic with no imports. Including it in
`tsconfig.preload.json` (CommonJS) causes both builds to compile it to
`electron/dist/parseApiBaseUrlArg.js`. The preload tsconfig runs second in
`electron:build`, so the CJS version wins in `dist/`. The main process files
do not import `parseApiBaseUrlArg.ts` at runtime, so the ESM version in dist
is never loaded — only the CJS version is. No conflict.

**`scripts/` directory created**
The inline `node -e` eval in `server:build` is the only candidate for
extraction right now. The directory is created for this one script.
Future build utilities (e.g., post-packaging steps for design log 11) will
land here.

## Testing Decisions

**What makes a good test here**: tests should verify the external behaviour of
the module — what it returns or what side effects it produces — not its
internal structure. For the purge, the goal is to confirm deleted code is truly
gone and surviving code still passes its existing test suite.

**MongoDB tests** — all deleted. They tested code that no longer exists.
The SQLite parity tests (`storage/__tests__/`, `__tests__/storage.sqlite.test.ts`)
continue to provide storage-layer coverage.

**Route tests** — kept as-is. Routes do not reference the Mongo driver; the
test helpers use `sqliteApp.ts` (an in-memory SQLite `createApp` fixture).
After removing the auth middleware from `app.ts`, the route tests should pass
unchanged because they never sent auth headers — `AUTH_DISABLED=1` was always
set in the test helper.

**`resolveRendererConfig.test.ts`** — the `corsOrigin` field and its three
assertions are removed (the field is deleted from `RendererConfig`). The
`loadProdRenderer` assertions are unchanged.

**`parseApiBaseUrlArg.test.ts`** — no changes. Tests import from the standalone
module, which is unaffected by the preload tsconfig change.

**`apiBaseUrl.test.ts`** — no changes. `window.horizon` is still populated in
the same shape; only the `App.tsx` platform check is removed.

**No new tests added** — the changes are either deletions or mechanical
simplifications of existing code paths. The behaviour under test does not
change.

## Out of Scope

- Desktop packaging (`electron-builder`, Windows installer, code signing) —
  design log 11, next workflow.
- UI redesign — after packaging is complete; driven by Figma/Stitch screenshots.
- AI features (monthly digest, anomaly detection, Sondertilgung advisor) —
  permanently deferred. The architecture for them (described in the design log)
  remains as documentation of intent, but no pipeline code will be written.
- MongoDB Atlas, Vercel + Render deployment — permanently out of scope.
- Google Auth — permanently removed.
- SQLCipher / at-rest encryption — deferred in design log 08, unchanged.
- macOS / Linux packaging — opportunistic, not planned.

## Further Notes

The `server/src/types/express.d.ts` file augments `Express.Locals` with
`storage: Storage`. It has no auth user type and is unchanged by this refactor.

The `dotenv` package is retained. In the Electron build, env vars are injected
by the main process; in standalone `server:dev`, dotenv loads `server/.env`
for local development. Keeping it avoids breaking the dev server workflow
before packaging replaces it.

After this refactor, `electron:start` becomes the canonical way to test the
full production path locally. The command chain is:
`electron:rebuild → build → electron:build → server:build → electron electron/dist/main.js`
(with `HORIZON_FORCE_PROD_RENDERER=1`).

## Problem Statement

The desktop-packaging build (issues #74–76) shipped a working Windows installer
but left seven consistency gaps behind: dead env vars in the IPC layer, a dead
property on the `contextBridge` surface, two divergent migration copy scripts,
a missing `files` allowlist that puts source/test/docs into the ASAR, test
packages in `dependencies` that inflate every installer, an inline esbuild
command that will not survive growth, and the most critical Electron module
having no tests.

None of these are regressions — the app works — but together they make the
packaging pipeline harder to understand, harder to extend, and riskier to
change.

## Solution

Seven small commits. Each one leaves the tests green and the installer
buildable. Work from the simplest (dead-code deletion) to the most involved
(serverHandle tests) so that every stopping point is a clean, shippable state.

## Commits

**Commit 1 — Remove dead env vars from serverHandle**

Delete `STORAGE_DRIVER: "sqlite"` and `AUTH_DISABLED: "1"` from the `env`
spread in `serverHandle.ts`. Both were consumed by the old multi-driver,
auth-guarded server and were removed in the desktop refactor. The server
process ignores them today. After this commit the env spread contains only
three entries: `PORT`, `HORIZON_DB_PATH`, and the spread of `process.env`.

**Commit 2 — Remove `platform` from the IPC contract**

Remove `platform: "electron"` from the `contextBridge` call in `preload.ts`.
Narrow the `Window.horizon` type in `horizon.d.ts` to `{ apiBaseUrl: string }`.
Drop `platform` from the `HorizonGlobal` union and the fixture object in
`apiBaseUrl.test.ts`. Nothing in the renderer reads `window.horizon.platform`;
it is dead weight on the security boundary. After this commit the IPC surface
is minimal: one string, one purpose.

**Commit 3 — Consolidate the migration copy scripts**

Rewrite `scripts/copy-migrations.mjs` to accept a `--dest <path>` CLI
argument. Delete `scripts/copy-migrations-bundle.mjs`. Update `server:build`
in `package.json` to pass `--dest server/dist/storage/sqlite/migrations` and
`server:bundle` to pass `--dest server/dist/migrations`. Add a short comment
in `server/src/storage/sqlite/migrate.ts` above the `MIGRATIONS_DIR` constant
explaining why `import.meta.url` is used for path resolution: in the tsc
output each module sits at its source-relative location; in the esbuild bundle
the entire server collapses into one file, so `__dirname` changes. The comment
makes the two different `--dest` values in `package.json` self-documenting.

**Commit 4 — Extract the server bundle esbuild invocation to a script**

Create `scripts/bundle-server.mjs`. It invokes esbuild programmatically
(using the esbuild JS API) with the same flags currently inlined in
`package.json`: entry `server/src/server.ts`, platform `node`, format `esm`,
external `better-sqlite3`, outfile `server/dist/server.bundle.js`. Update
`server:bundle` in `package.json` to `node scripts/bundle-server.mjs && node
scripts/copy-migrations.mjs --dest server/dist/migrations`. The script can
now be extended (sourcemaps, define values, additional externals) without
touching `package.json`.

**Commit 5 — Move test-only packages to devDependencies**

Move `@testing-library/jest-dom`, `@testing-library/react`, and `jsdom` from
`dependencies` to `devDependencies` in `package.json`. These packages are
never imported at runtime; they exist only for Vitest. Electron-builder
includes all `dependencies` in the installer — keeping these there inflates
every release artifact. Run the full test suite after the move to confirm
nothing breaks.

**Commit 6 — Add the `files` allowlist to electron-builder config**

Add `"files": ["dist/**", "electron/dist/**", "server/dist/**"]` to the
`build` block in `package.json`. Without this, electron-builder's default
`["**/*"]` packs TypeScript source files, test files, `docs/`, `scripts/`,
and everything else that is not in its built-in exclude list into the ASAR.
Only compiled and bundled artifacts belong in the installer. The `files`
field does not affect how electron-builder discovers production
`node_modules` — `better-sqlite3` continues to be included automatically
because it remains in `dependencies`.

**Commit 7 — Add tests for serverHandle**

Write `electron/serverHandle.test.ts`. Mock the `electron` module with
`vi.mock('electron')` to provide a controllable `utilityProcess.fork`
implementation. The fake child exposes `emit` so tests can fire `message`
and `exit` events on demand.

Cover:

- `start()` resolves with the correct port when the child emits a `ready`
  message
- `start()` calls the `fatalHandler` and rejects when the child emits a
  `fatal` message
- `start()` rejects with a descriptive timeout error when no message arrives
  within `READY_TIMEOUT_MS`
- `onFatal` registered after `start()` resolves still fires if the child
  emits `fatal` later (post-start fatal)
- `shutdown()` sends `{ type: "shutdown" }` to the child and resolves once
  the child exits

Do not test the internals of `resolveServerEntry` or `awaitExitOrKill` —
those are already covered by their own unit tests. Test only the external
behaviour of `ServerHandle`.

## Decision Document

**Dead env vars** — `STORAGE_DRIVER` and `AUTH_DISABLED` were injected so
the old server's runtime branching logic would activate the SQLite path and
disable auth. Both branches are gone. The vars are removed, not replaced.

**`platform` removal** — The only consumer of `window.horizon` is
`resolveApiBaseUrl`, which reads `apiBaseUrl` and nothing else. The
`platform` property was never used in the renderer and will not be replaced.
The type narrows to `{ apiBaseUrl: string }`.

**Single parameterised copy script** — Both copy scripts share the same
source directory (`server/src/storage/sqlite/migrations`); only the
destination differs. A `--dest` argument is the minimal change: one file to
maintain, both build modes still work, no new dependencies.

**esbuild JS API over CLI** — The programmatic API is easier to extend and
easier to read than a long shell string. It is the same esbuild package
already in the tree.

**`files` allowlist strategy** — A whitelist (`dist/**`, `electron/dist/**`,
`server/dist/**`) is safer than a blacklist. Anything new added to the repo
that is not a compiled artifact is excluded by default rather than included
by accident.

**`better-sqlite3` packaging** — `better-sqlite3` stays in `dependencies`
(not moved to `devDependencies`) because electron-builder relies on the
`dependencies` field to discover which `node_modules` to include. Removing it
from `dependencies` would break the packaged build. The `.node` binary
continues to be extracted via `asarUnpack: ["**/*.node"]`.

**`serverHandle` test injection strategy** — `utilityProcess` is imported
from `electron` at module scope; tests mock the `electron` module with
`vi.mock`. The fake fork returns an event emitter so tests can trigger
`message` and `exit` events synchronously. The `resolveServerEntry` call
inside `start()` is covered by its own test file and is not re-tested here.

## Testing Decisions

A good test for `serverHandle` tests the external contract of `ServerHandle`
only: what `start()` resolves to, what it rejects with, when `fatalHandler`
fires, and what `shutdown()` does. It does not assert on which child process
flags were passed, does not test `tagLines` formatting, and does not spy on
stdout/stderr writes.

Prior art: `electron/resolveServerEntry.test.ts` and
`electron/awaitExitOrKill.test.ts` show the established pattern — import the
module under test, assert on its return values and side effects, mock only
what is necessary. `serverHandle.test.ts` follows the same style with the
addition of `vi.mock('electron')`.

## Out of Scope

- Auto-update, code signing, arm64 targets — by design, per the desktop
  packaging design log
- `resolveSqlitePath` fallback to `"./horizon.db"` — intentional and correct
  for `server:dev` mode
- Icon — placeholder by design; will be replaced during the UI redesign feature
- The `electron:build` preload esbuild invocation — it is simple enough inline
  and not growing; extract only if it grows
- macOS / Linux installer targets — Windows-only personal tool

## Further Notes

The `import.meta.url` pattern in `migrate.ts` is load-bearing. If esbuild
ever gains a `--loader:.sql=file` configuration that can bundle SQL migration
files directly into the server bundle (eliminating the copy step entirely),
the migration copy scripts become obsolete. That is a future optimisation, not
in scope here.

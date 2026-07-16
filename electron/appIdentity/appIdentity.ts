/**
 * Windows resolves taskbar grouping — and the icon of a pinned shortcut — via
 * the AppUserModelID. electron-builder stamps `build.appId` onto the shortcut
 * it installs; unless the running app declares the same id, Electron derives one
 * from the exe path and Windows treats the live window and the pinned shortcut
 * as two different apps, which surfaces as a stale or wrong taskbar icon.
 *
 * Deliberately a literal rather than a read of `package.json`: electron-builder
 * strips the `build` field from the packaged package.json, so reading it would
 * work in dev and throw on launch in the shipped app. `appIdentity.test.ts`
 * pins this to `build.appId` so the two cannot drift.
 */
export const APP_USER_MODEL_ID = "io.github.carlosrezai.horizon";

import { spawnSync } from "node:child_process";

// Typechecks every project: the app (tests included) through the solution
// file, then the server and the Electron shell, which the solution does not
// reference. `--shipping` swaps the app for tsconfig.app.shipping.json, which
// leaves out the test files — the commit-msg hook runs that for a `test:`
// commit, because a RED test written against a module that does not exist yet
// cannot typecheck.
//
// tsc is run through node rather than node_modules/.bin, so Windows never
// spawns cmd.exe (and a focus-stealing console window) for it.

const TSC = "node_modules/typescript/bin/tsc";
const shipping = process.argv.includes("--shipping");

const runs = [
  shipping
    ? ["-p", "tsconfig.app.shipping.json", "--noEmit"]
    : ["-b", "--force"],
  ["-p", "server/tsconfig.json", "--noEmit"],
  ["-p", "electron", "--noEmit"],
];

for (const args of runs) {
  const { status } = spawnSync(process.execPath, [TSC, ...args], {
    stdio: "inherit",
    shell: false,
  });
  if (status !== 0) process.exit(status ?? 1);
}

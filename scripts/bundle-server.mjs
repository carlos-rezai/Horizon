import { build } from "esbuild";

await build({
  entryPoints: ["server/src/server.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  external: ["better-sqlite3"],
  outfile: "server/dist/server.bundle.js",
});

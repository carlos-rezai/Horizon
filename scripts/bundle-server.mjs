import { build } from "esbuild";

await build({
  entryPoints: ["server/src/server.ts"],
  bundle: true,
  platform: "node",
  format: "cjs",
  external: ["better-sqlite3"],
  outfile: "server/dist/server.bundle.cjs",
});

import { build } from "esbuild";

await build({
  entryPoints: ["server/src/server.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  external: ["better-sqlite3"],
  banner: {
    js: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);",
  },
  outfile: "server/dist/server.bundle.js",
});

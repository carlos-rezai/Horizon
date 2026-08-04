import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    include: [
      "server/src/**/*.test.ts",
      "src/**/*.test.{ts,tsx}",
      "electron/**/*.test.ts",
    ],
    environment: "node",
    setupFiles: ["./vitest.setup.ts"],
    globals: false,
    pool: "forks",
    // Vitest defaults to 5s, which this suite sits too close to. The
    // `is importable from <layer>/index.ts` tests each `await import()` a whole
    // barrel and pay for transforming its entire module graph — around 3.2s
    // apiece on an idle machine — and the SQLite migration tests build real
    // databases. Under the parallel-fork contention of a full run (or a busy
    // CI box) that margin vanishes and a healthy test fails on the clock
    // rather than on an assertion, in whichever file happens to be starved.
    // These limits are a backstop against scheduling noise, not permission for
    // slow tests.
    testTimeout: 20000,
    hookTimeout: 20000,
  },
});

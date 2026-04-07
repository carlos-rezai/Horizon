import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    include: ["server/src/__tests__/**/*.test.ts", "src/**/*.test.{ts,tsx}"],
    environmentMatchGlobs: [
      ["server/src/**", "node"],
      ["src/**", "jsdom"],
    ],
    setupFiles: ["./src/test-setup.ts"],
    globals: false,
    pool: "forks",
  },
});

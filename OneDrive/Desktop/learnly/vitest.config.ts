import { defineConfig } from "vitest/config";
import path from "path";

/**
 * Vitest configuration.
 *
 * • environment: "node" — lib/bkt.ts has no browser dependencies.
 * • alias: mirrors the Next.js "@/*" path alias so test imports resolve.
 * • include: only picks up files in the __tests__ directory.
 * • exclude: keeps Next.js build artefacts out of the test run.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["**/__tests__/**/*.test.ts"],
    exclude: ["node_modules", ".next"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});

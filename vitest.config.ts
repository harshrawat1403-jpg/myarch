import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    	// Limit test concurrency to avoid intermittent timeouts in
	// browser/crypto-heavy test files while keeping the suite parallel.
	maxWorkers: 4,
    include: [
      "tests/unit/**/*.test.{ts,tsx}",
      "tests/integration/**/*.test.{ts,tsx}",
    ],
    setupFiles: ["./tests/support/setup.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});

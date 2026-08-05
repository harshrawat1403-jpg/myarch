import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

// Vitest's `globals` option is intentionally left off (every test file
// explicitly imports describe/it/expect from "vitest"), so React Testing
// Library's usual auto-cleanup-via-global-afterEach doesn't engage on its
// own — without this, components from one test stay mounted (and their
// effects keep firing) into the next test in the same file.
afterEach(() => {
  cleanup();
});

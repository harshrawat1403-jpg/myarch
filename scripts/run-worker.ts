/**
 * Standalone entrypoint for the Background Job Processing System's worker.
 * Deliberately outside src/ and outside the Next.js request pipeline — this
 * runs as its own Node process, consistent with
 * docs/architecture/06_Technology_Stack.md's "Background Jobs:
 * Database-Backed Queue... polled by a scheduled task" (the hosting
 * platform itself is still an open decision, docs/planning/18_Open_Questions.md
 * Q1 — this script supports either a long-running daemon on a
 * container/VPS, or a single pass triggered by an external scheduler/cron
 * on a platform with no persistent-process support, without needing that
 * decision made first).
 *
 * Usage:
 *   npm run worker        — long-running daemon: polls continuously until
 *                            SIGTERM/SIGINT, then shuts down gracefully.
 *   npm run worker:once    — claims and processes a single batch, then exits.
 *                            Intended for an external scheduler (cron, a
 *                            platform Scheduled Function) to invoke
 *                            periodically instead of running a daemon.
 *
 * Registering a new module's job handlers here is the one place adding a
 * background job type touches outside that module itself — JobWorker's own
 * code never changes (see src/modules/jobs/index.ts's doc comment).
 */
import { createJobWorker } from "@/modules/jobs";
import { registerJobHandlers as registerNotificationJobHandlers } from "@/modules/notifications";

function registerAllJobHandlers(): void {
  registerNotificationJobHandlers();
  // Future modules with background jobs register here too, e.g.:
  // registerExportJobHandlers();
  // registerCleanupJobHandlers();
}

async function runOnce(): Promise<void> {
  registerAllJobHandlers();
  const worker = createJobWorker();
  const claimed = await worker.pollOnce();
  console.log(`[worker] single pass complete (id=${worker.getWorkerId()}, claimed=${claimed})`);
}

async function runDaemon(): Promise<void> {
  registerAllJobHandlers();
  const worker = createJobWorker();

  let shuttingDown = false;
  const shutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`[worker] received ${signal}, shutting down gracefully...`);
    await worker.stop();
    process.exit(0);
  };

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));

  worker.start();
  console.log(`[worker] started (id=${worker.getWorkerId()})`);
}

const once = process.argv.includes("--once");

(once ? runOnce() : runDaemon()).catch((err) => {
  console.error("[worker] fatal error", err);
  process.exit(1);
});

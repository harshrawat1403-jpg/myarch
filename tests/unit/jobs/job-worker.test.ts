import { describe, expect, it, vi } from "vitest";
import { JobRegistry, JobWorker } from "../../../src/modules/jobs";
import { InMemoryJobRepository } from "../../support/fakes/in-memory-job-repository";
import { FakeJobLogger } from "../../support/fakes/fake-job-logger";
import { FakeJobMetricsRecorder } from "../../support/fakes/fake-job-metrics-recorder";
import { FakeJobHandler } from "../../support/fakes/fake-job-handler";

function buildWorker(overrides: { repository?: InMemoryJobRepository; registry?: JobRegistry } = {}) {
  const repository = overrides.repository ?? new InMemoryJobRepository();
  const registry = overrides.registry ?? new JobRegistry();
  const logger = new FakeJobLogger();
  const metrics = new FakeJobMetricsRecorder();
  const worker = new JobWorker({ jobRepository: repository, jobRegistry: registry, logger, metrics }, { pollIntervalMs: 5, batchSize: 5 });
  return { repository, registry, logger, metrics, worker };
}

describe("JobWorker.pollOnce — claiming and execution", () => {
  it("returns 0 and touches the repository not at all when no handlers are registered", async () => {
    const { repository, worker } = buildWorker();
    const claimSpy = vi.spyOn(repository, "claimBatch");

    const claimed = await worker.pollOnce();

    expect(claimed).toBe(0);
    expect(claimSpy).not.toHaveBeenCalled();
  });

  it("claims and successfully executes a job, marking it COMPLETED with a recorded executionTimeMs", async () => {
    const { repository, registry, metrics, worker } = buildWorker();
    const handler = new FakeJobHandler("SEND_NOTIFICATION");
    registry.register(handler);
    const job = await repository.enqueue({ type: "SEND_NOTIFICATION", payload: { a: 1 }, runAt: new Date(0), maxAttempts: 5 });

    const claimed = await worker.pollOnce();

    expect(claimed).toBe(1);
    expect(handler.calls).toEqual([{ a: 1 }]);
    const reloaded = await repository.findById(job.id);
    expect(reloaded!.status).toBe("COMPLETED");
    expect(reloaded!.executionTimeMs).toBeGreaterThanOrEqual(0);
    expect(reloaded!.completedAt).not.toBeNull();
    expect(metrics.started).toEqual(["SEND_NOTIFICATION"]);
    expect(metrics.completed).toHaveLength(1);
  });

  it("dead-letters a job immediately if its type has no registered handler, without calling anything", async () => {
    // Unreachable via a real poll (claimBatch only claims registered types),
    // but exercised directly here as a defensive-code regression: if a
    // handler is ever missing for a type the registry still reports, the
    // job must not be retried forever.
    const { repository, registry, worker } = buildWorker();
    registry.register(new FakeJobHandler("SEND_NOTIFICATION"));
    vi.spyOn(registry, "get").mockReturnValue(undefined);
    const job = await repository.enqueue({ type: "SEND_NOTIFICATION", payload: {}, runAt: new Date(0), maxAttempts: 5 });

    await worker.pollOnce();

    const reloaded = await repository.findById(job.id);
    expect(reloaded!.status).toBe("FAILED");
    expect(reloaded!.errorMessage).toMatch(/no handler registered/i);
  });
});

describe("JobWorker — retry and dead-letter", () => {
  it("marks a failing job RETRYING with a future nextRetryAt when attempts remain", async () => {
    const { repository, registry, metrics, worker } = buildWorker();
    const handler = new FakeJobHandler("SEND_NOTIFICATION");
    handler.shouldThrow = true;
    registry.register(handler);
    const job = await repository.enqueue({ type: "SEND_NOTIFICATION", payload: {}, runAt: new Date(0), maxAttempts: 3 });

    await worker.pollOnce();

    const reloaded = await repository.findById(job.id);
    expect(reloaded!.status).toBe("RETRYING");
    expect(reloaded!.attempts).toBe(1);
    expect(reloaded!.errorMessage).toBe("Simulated handler failure");
    expect(reloaded!.nextRetryAt!.getTime()).toBeGreaterThan(Date.now());
    expect(reloaded!.runAt.getTime()).toBe(reloaded!.nextRetryAt!.getTime());
    expect(metrics.retried).toEqual(["SEND_NOTIFICATION"]);
    expect(handler.permanentFailures).toHaveLength(0);
  });

  it("is picked back up on a later poll once nextRetryAt has passed", async () => {
    const { repository, registry, worker } = buildWorker();
    const handler = new FakeJobHandler("SEND_NOTIFICATION");
    handler.shouldThrow = true;
    registry.register(handler);
    await repository.enqueue({ type: "SEND_NOTIFICATION", payload: {}, runAt: new Date(0), maxAttempts: 3 });

    await worker.pollOnce(); // attempt 1: fails, scheduled for retry in the future
    const afterFirstPoll = await worker.pollOnce(); // retry not due yet
    expect(afterFirstPoll).toBe(0);

    // Force the retry to be due now, simulating time passing.
    repository.jobs[0] = { ...repository.jobs[0]!, runAt: new Date(0) };
    handler.shouldThrow = false;

    const afterRetryDue = await worker.pollOnce();
    expect(afterRetryDue).toBe(1);
    const reloaded = await repository.findById(repository.jobs[0]!.id);
    expect(reloaded!.status).toBe("COMPLETED");
    expect(reloaded!.attempts).toBe(2);
  });

  it("dead-letters (FAILED) once attempts reaches maxAttempts, and calls onPermanentFailure exactly once", async () => {
    const { repository, registry, metrics, worker } = buildWorker();
    const handler = new FakeJobHandler("SEND_NOTIFICATION");
    handler.shouldThrow = true;
    registry.register(handler);
    const job = await repository.enqueue({ type: "SEND_NOTIFICATION", payload: { x: 1 }, runAt: new Date(0), maxAttempts: 1 });

    await worker.pollOnce();

    const reloaded = await repository.findById(job.id);
    expect(reloaded!.status).toBe("FAILED");
    expect(reloaded!.attempts).toBe(1);
    expect(reloaded!.errorMessage).toBe("Simulated handler failure");
    expect(metrics.failed).toHaveLength(1);
    expect(handler.permanentFailures).toHaveLength(1);
    expect(handler.permanentFailures[0]!.payload).toEqual({ x: 1 });
    expect(handler.permanentFailures[0]!.error.message).toBe("Simulated handler failure");
  });

  it("logs but does not throw when onPermanentFailure itself fails", async () => {
    const { repository, registry, logger, worker } = buildWorker();
    const handler = new FakeJobHandler("SEND_NOTIFICATION");
    handler.shouldThrow = true;
    handler.onPermanentFailure = async () => {
      throw new Error("hook exploded");
    };
    registry.register(handler);
    await repository.enqueue({ type: "SEND_NOTIFICATION", payload: {}, runAt: new Date(0), maxAttempts: 1 });

    await expect(worker.pollOnce()).resolves.toBe(1);
    expect(logger.entries.some((e) => e.event === "job.permanent_failure_hook_error")).toBe(true);
  });
});

describe("JobWorker — duplicate execution prevention across a shared repository", () => {
  it("two workers polling the same repository never execute the same job", async () => {
    const repository = new InMemoryJobRepository();
    const registryA = new JobRegistry();
    const registryB = new JobRegistry();
    const handlerA = new FakeJobHandler("SEND_NOTIFICATION");
    const handlerB = new FakeJobHandler("SEND_NOTIFICATION");
    registryA.register(handlerA);
    registryB.register(handlerB);

    await repository.enqueue({ type: "SEND_NOTIFICATION", payload: { id: 1 }, runAt: new Date(0), maxAttempts: 5 });
    await repository.enqueue({ type: "SEND_NOTIFICATION", payload: { id: 2 }, runAt: new Date(0), maxAttempts: 5 });

    const { worker: workerA } = buildWorker({ repository, registry: registryA });
    const { worker: workerB } = buildWorker({ repository, registry: registryB });

    await workerA.pollOnce();
    await workerB.pollOnce();

    // Between the two workers, both jobs ran, and no job ran on both.
    const allCalls = [...handlerA.calls, ...handlerB.calls];
    expect(allCalls).toHaveLength(2);
    expect(new Set(allCalls.map((c) => c.id)).size).toBe(2);
  });
});

describe("JobWorker — start/stop lifecycle and graceful shutdown", () => {
  it("start() begins polling; stop() waits for the in-flight job to finish before resolving", async () => {
    const { repository, registry, worker } = buildWorker();
    const order: string[] = [];
    let resolveHandler!: () => void;
    const handlerGate = new Promise<void>((resolve) => {
      resolveHandler = resolve;
    });

    registry.register({
      type: "SLOW_JOB",
      handle: async () => {
        order.push("handler-start");
        await handlerGate;
        order.push("handler-end");
      },
    });
    await repository.enqueue({ type: "SLOW_JOB", payload: {}, runAt: new Date(0), maxAttempts: 3 });

    worker.start();
    expect(worker.isRunning()).toBe(true);

    await vi.waitFor(() => expect(order).toContain("handler-start"));

    const stopPromise = worker.stop().then(() => {
      order.push("stop-resolved");
    });

    resolveHandler();
    await stopPromise;

    expect(order).toEqual(["handler-start", "handler-end", "stop-resolved"]);
    expect(worker.isRunning()).toBe(false);

    const job = repository.jobs[0]!;
    expect(job.status).toBe("COMPLETED");
  });

  it("start() is idempotent — calling it twice does not start a second loop", () => {
    const { worker } = buildWorker();
    worker.start();
    const firstLoopRunning = worker.isRunning();
    worker.start();
    expect(firstLoopRunning).toBe(true);
    expect(worker.isRunning()).toBe(true);
  });

  it("stop() is safe to call on a worker that was never started", async () => {
    const { worker } = buildWorker();
    await expect(worker.stop()).resolves.toBeUndefined();
  });

  it("assigns a unique workerId per instance by default", () => {
    const { worker: workerA } = buildWorker();
    const { worker: workerB } = buildWorker();
    expect(workerA.getWorkerId()).not.toBe(workerB.getWorkerId());
  });
});

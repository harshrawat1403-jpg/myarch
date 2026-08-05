/**
 * Exercises the fake's atomic-claim contract directly — the same contract
 * PrismaJobRepository.claimBatch() guarantees via `FOR UPDATE SKIP LOCKED`
 * against real Postgres (untestable here without a live database, per this
 * project's standing limitation — see every prior module's Prisma-backed
 * repository). If this contract doesn't hold in the fake, no test built on
 * top of it (job-worker.test.ts's duplicate-prevention test included) would
 * be meaningful.
 */
import { describe, expect, it } from "vitest";
import { InMemoryJobRepository } from "../../support/fakes/in-memory-job-repository";

describe("InMemoryJobRepository — enqueue", () => {
  it("creates a PENDING job with attempts=0 and the given maxAttempts/runAt", async () => {
    const repo = new InMemoryJobRepository();
    const runAt = new Date("2026-08-05T00:00:00Z");
    const job = await repo.enqueue({ type: "SEND_NOTIFICATION", payload: { a: 1 }, runAt, maxAttempts: 3 });

    expect(job.status).toBe("PENDING");
    expect(job.attempts).toBe(0);
    expect(job.maxAttempts).toBe(3);
    expect(job.runAt).toEqual(runAt);
    expect(job.payload).toEqual({ a: 1 });
  });
});

describe("InMemoryJobRepository — claimBatch", () => {
  it("only claims PENDING/RETRYING jobs whose runAt has passed and whose type is requested", async () => {
    const repo = new InMemoryJobRepository();
    const now = new Date("2026-08-05T12:00:00Z");
    const future = new Date("2026-08-06T00:00:00Z");
    const past = new Date("2026-08-01T00:00:00Z");

    await repo.enqueue({ type: "SEND_NOTIFICATION", payload: {}, runAt: past, maxAttempts: 5 });
    await repo.enqueue({ type: "SEND_NOTIFICATION", payload: {}, runAt: future, maxAttempts: 5 });
    await repo.enqueue({ type: "OTHER_TYPE", payload: {}, runAt: past, maxAttempts: 5 });

    const claimed = await repo.claimBatch({ workerId: "w1", types: ["SEND_NOTIFICATION"], batchSize: 10, now });

    expect(claimed).toHaveLength(1);
    expect(claimed[0]!.type).toBe("SEND_NOTIFICATION");
    expect(claimed[0]!.status).toBe("PROCESSING");
    expect(claimed[0]!.attempts).toBe(1);
    expect(claimed[0]!.lockedBy).toBe("w1");
  });

  it("never returns the same job to two sequential claim calls (duplicate-execution prevention)", async () => {
    const repo = new InMemoryJobRepository();
    const now = new Date();
    await repo.enqueue({ type: "T", payload: {}, runAt: new Date(0), maxAttempts: 5 });
    await repo.enqueue({ type: "T", payload: {}, runAt: new Date(0), maxAttempts: 5 });

    const firstClaim = await repo.claimBatch({ workerId: "worker-a", types: ["T"], batchSize: 1, now });
    const secondClaim = await repo.claimBatch({ workerId: "worker-b", types: ["T"], batchSize: 1, now });

    expect(firstClaim).toHaveLength(1);
    expect(secondClaim).toHaveLength(1);
    expect(firstClaim[0]!.id).not.toBe(secondClaim[0]!.id);
  });

  it("respects batchSize", async () => {
    const repo = new InMemoryJobRepository();
    for (let i = 0; i < 5; i++) {
      await repo.enqueue({ type: "T", payload: {}, runAt: new Date(0), maxAttempts: 5 });
    }
    const claimed = await repo.claimBatch({ workerId: "w1", types: ["T"], batchSize: 2, now: new Date() });
    expect(claimed).toHaveLength(2);
  });

  it("claims RETRYING jobs once their runAt has passed, not just PENDING ones", async () => {
    const repo = new InMemoryJobRepository();
    const job = await repo.enqueue({ type: "T", payload: {}, runAt: new Date(0), maxAttempts: 5 });
    await repo.markRetrying(job.id, { errorMessage: "boom", nextRetryAt: new Date(0), executionTimeMs: 5 });

    const claimed = await repo.claimBatch({ workerId: "w1", types: ["T"], batchSize: 5, now: new Date() });
    expect(claimed).toHaveLength(1);
    expect(claimed[0]!.id).toBe(job.id);
  });
});

describe("InMemoryJobRepository — state transitions", () => {
  it("markCompleted sets status/completedAt/executionTimeMs and clears lockedBy", async () => {
    const repo = new InMemoryJobRepository();
    const job = await repo.enqueue({ type: "T", payload: {}, runAt: new Date(0), maxAttempts: 5 });
    await repo.claimBatch({ workerId: "w1", types: ["T"], batchSize: 1, now: new Date() });

    await repo.markCompleted(job.id, 42);
    const reloaded = await repo.findById(job.id);

    expect(reloaded!.status).toBe("COMPLETED");
    expect(reloaded!.executionTimeMs).toBe(42);
    expect(reloaded!.completedAt).not.toBeNull();
    expect(reloaded!.lockedBy).toBeNull();
  });

  it("markRetrying sets status RETRYING, errorMessage, nextRetryAt, and advances runAt", async () => {
    const repo = new InMemoryJobRepository();
    const job = await repo.enqueue({ type: "T", payload: {}, runAt: new Date(0), maxAttempts: 5 });
    const nextRetryAt = new Date("2030-01-01T00:00:00Z");

    await repo.markRetrying(job.id, { errorMessage: "transient", nextRetryAt, executionTimeMs: 7 });
    const reloaded = await repo.findById(job.id);

    expect(reloaded!.status).toBe("RETRYING");
    expect(reloaded!.errorMessage).toBe("transient");
    expect(reloaded!.nextRetryAt).toEqual(nextRetryAt);
    expect(reloaded!.runAt).toEqual(nextRetryAt);
  });

  it("markFailed sets status FAILED with the error message", async () => {
    const repo = new InMemoryJobRepository();
    const job = await repo.enqueue({ type: "T", payload: {}, runAt: new Date(0), maxAttempts: 5 });

    await repo.markFailed(job.id, { errorMessage: "permanent", executionTimeMs: 3 });
    const reloaded = await repo.findById(job.id);

    expect(reloaded!.status).toBe("FAILED");
    expect(reloaded!.errorMessage).toBe("permanent");
  });

  it("cancel sets status CANCELLED", async () => {
    const repo = new InMemoryJobRepository();
    const job = await repo.enqueue({ type: "T", payload: {}, runAt: new Date(0), maxAttempts: 5 });

    await repo.cancel(job.id);
    const reloaded = await repo.findById(job.id);
    expect(reloaded!.status).toBe("CANCELLED");
  });
});

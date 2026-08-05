import { describe, expect, it } from "vitest";
import { DEFAULT_MAX_ATTEMPTS } from "../../../src/modules/jobs";
import { DefaultJobDispatcher } from "../../../src/modules/jobs/application/default-job-dispatcher";
import { InMemoryJobRepository } from "../../support/fakes/in-memory-job-repository";

describe("DefaultJobDispatcher", () => {
  it("enqueues a job with the given type/payload, defaulting runAt to now and maxAttempts to DEFAULT_MAX_ATTEMPTS", async () => {
    const repository = new InMemoryJobRepository();
    const dispatcher = new DefaultJobDispatcher({ jobRepository: repository });

    const before = Date.now();
    const { jobId } = await dispatcher.dispatch("SEND_NOTIFICATION", { studentName: "Alice" });
    const after = Date.now();

    expect(repository.jobs).toHaveLength(1);
    const job = repository.jobs[0]!;
    expect(job.id).toBe(jobId);
    expect(job.type).toBe("SEND_NOTIFICATION");
    expect(job.payload).toEqual({ studentName: "Alice" });
    expect(job.maxAttempts).toBe(DEFAULT_MAX_ATTEMPTS);
    expect(job.runAt.getTime()).toBeGreaterThanOrEqual(before);
    expect(job.runAt.getTime()).toBeLessThanOrEqual(after);
  });

  it("honors an explicit runAt and maxAttempts (e.g. a scheduled reminder)", async () => {
    const repository = new InMemoryJobRepository();
    const dispatcher = new DefaultJobDispatcher({ jobRepository: repository });
    const runAt = new Date("2030-01-01T00:00:00Z");

    await dispatcher.dispatch("SCHEDULED_REMINDER", {}, { runAt, maxAttempts: 1 });

    const job = repository.jobs[0]!;
    expect(job.runAt).toEqual(runAt);
    expect(job.maxAttempts).toBe(1);
  });
});

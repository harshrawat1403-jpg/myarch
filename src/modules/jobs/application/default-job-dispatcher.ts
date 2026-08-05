import type { JobType } from "../domain/entities";
import { DEFAULT_MAX_ATTEMPTS } from "../domain/entities";
import type { DispatchOptions, JobDispatcher } from "./job-dispatcher";
import type { JobRepository } from "./ports/job-repository";

export class DefaultJobDispatcher implements JobDispatcher {
  constructor(private readonly deps: { jobRepository: JobRepository }) {}

  async dispatch(
    type: JobType,
    payload: Record<string, unknown>,
    options: DispatchOptions = {},
  ): Promise<{ jobId: string }> {
    const job = await this.deps.jobRepository.enqueue({
      type,
      payload,
      runAt: options.runAt ?? new Date(),
      maxAttempts: options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS,
    });
    return { jobId: job.id };
  }
}

import type { DispatchOptions, JobDispatcher } from "../../../src/modules/jobs";
import type { JobType } from "../../../src/modules/jobs";

export interface RecordedDispatch {
  type: JobType;
  payload: Record<string, unknown>;
  options?: DispatchOptions;
}

export class FakeJobDispatcher implements JobDispatcher {
  readonly dispatched: RecordedDispatch[] = [];

  async dispatch(type: JobType, payload: Record<string, unknown>, options?: DispatchOptions): Promise<{ jobId: string }> {
    this.dispatched.push({ type, payload, options });
    return { jobId: `fake-job-${this.dispatched.length}` };
  }
}

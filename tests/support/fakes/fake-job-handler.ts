import type { JobHandler } from "../../../src/modules/jobs";

export class FakeJobHandler implements JobHandler {
  readonly type: string;
  readonly calls: Record<string, unknown>[] = [];
  readonly permanentFailures: Array<{ payload: Record<string, unknown>; error: Error }> = [];
  shouldThrow = false;

  constructor(type: string) {
    this.type = type;
  }

  async handle(payload: Record<string, unknown>): Promise<void> {
    this.calls.push(payload);
    if (this.shouldThrow) {
      throw new Error("Simulated handler failure");
    }
  }

  async onPermanentFailure(payload: Record<string, unknown>, error: Error): Promise<void> {
    this.permanentFailures.push({ payload, error });
  }
}

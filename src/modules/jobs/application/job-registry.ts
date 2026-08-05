import type { JobHandler } from "./job-handler";

/**
 * The "job registry" named in the architecture requirement, and the whole
 * reason adding a new background job never requires a JobWorker change: a
 * handler registers itself under its own type string, and JobWorker only
 * ever asks the registry "is there a handler for this job's type?" — it
 * never has a switch statement or if/else chain over job types.
 */
export class JobRegistry {
  private readonly handlers = new Map<string, JobHandler>();

  register(handler: JobHandler): void {
    if (this.handlers.has(handler.type)) {
      throw new Error(`A job handler is already registered for type "${handler.type}"`);
    }
    this.handlers.set(handler.type, handler);
  }

  get(type: string): JobHandler | undefined {
    return this.handlers.get(type);
  }

  has(type: string): boolean {
    return this.handlers.has(type);
  }

  registeredTypes(): string[] {
    return [...this.handlers.keys()];
  }
}

import { describe, expect, it } from "vitest";
import { JobRegistry } from "../../../src/modules/jobs";
import { FakeJobHandler } from "../../support/fakes/fake-job-handler";

describe("JobRegistry", () => {
  it("registers a handler and retrieves it by type", () => {
    const registry = new JobRegistry();
    const handler = new FakeJobHandler("SEND_NOTIFICATION");

    registry.register(handler);

    expect(registry.has("SEND_NOTIFICATION")).toBe(true);
    expect(registry.get("SEND_NOTIFICATION")).toBe(handler);
    expect(registry.registeredTypes()).toEqual(["SEND_NOTIFICATION"]);
  });

  it("returns undefined/false for an unregistered type", () => {
    const registry = new JobRegistry();
    expect(registry.get("UNKNOWN")).toBeUndefined();
    expect(registry.has("UNKNOWN")).toBe(false);
  });

  it("throws when registering a second handler for the same type — adding a job type is additive, not a silent override", () => {
    const registry = new JobRegistry();
    registry.register(new FakeJobHandler("SEND_NOTIFICATION"));

    expect(() => registry.register(new FakeJobHandler("SEND_NOTIFICATION"))).toThrow(/already registered/i);
  });

  it("supports multiple distinct job types, proving the worker never needs per-type code", () => {
    const registry = new JobRegistry();
    registry.register(new FakeJobHandler("SEND_NOTIFICATION"));
    registry.register(new FakeJobHandler("GENERATE_EXPORT"));
    registry.register(new FakeJobHandler("CLEANUP_STALE_DATA"));

    expect(registry.registeredTypes().sort()).toEqual(["CLEANUP_STALE_DATA", "GENERATE_EXPORT", "SEND_NOTIFICATION"]);
  });
});

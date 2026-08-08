import { describe, expect, it } from "vitest";
import { runBulkOperation } from "../../../src/lib/bulk-operation";

describe("runBulkOperation", () => {
  it("reports every id as succeeded when the operation never throws", async () => {
    const result = await runBulkOperation(["a", "b", "c"], async () => {});
    expect(result.succeeded).toEqual(["a", "b", "c"]);
    expect(result.failed).toHaveLength(0);
  });

  it("collects per-id failures instead of aborting the whole batch on the first error", async () => {
    const result = await runBulkOperation(["a", "b", "c"], async (id) => {
      if (id === "b") throw new Error("boom");
    });

    expect(result.succeeded).toEqual(["a", "c"]);
    expect(result.failed).toEqual([{ id: "b", error: "boom" }]);
  });

  it("falls back to a generic message for a non-Error throw", async () => {
    const result = await runBulkOperation(["a"], async () => {
      return Promise.reject("not an Error instance");
    });

    expect(result.failed).toEqual([{ id: "a", error: "Unknown error" }]);
  });

  it("returns empty results for an empty id list", async () => {
    const result = await runBulkOperation([], async () => {});
    expect(result.succeeded).toHaveLength(0);
    expect(result.failed).toHaveLength(0);
  });
});

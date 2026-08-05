import { describe, expect, it } from "vitest";
import {
  CreateBatchRequestSchema,
  UpdateBatchRequestSchema,
  UpdateBatchStatusRequestSchema,
} from "../../../src/modules/batches/presentation/validation";

describe("CreateBatchRequestSchema", () => {
  it("accepts a valid payload", () => {
    expect(CreateBatchRequestSchema.safeParse({ name: "B.Arch 2026", year: 2026 }).success).toBe(true);
  });

  it("rejects an empty name", () => {
    expect(CreateBatchRequestSchema.safeParse({ name: "", year: 2026 }).success).toBe(false);
  });

  it("rejects an out-of-range year", () => {
    expect(CreateBatchRequestSchema.safeParse({ name: "X", year: 1800 }).success).toBe(false);
  });

  it("rejects a non-integer year", () => {
    expect(CreateBatchRequestSchema.safeParse({ name: "X", year: 2026.5 }).success).toBe(false);
  });
});

describe("UpdateBatchRequestSchema", () => {
  it("rejects a completely empty update", () => {
    expect(UpdateBatchRequestSchema.safeParse({}).success).toBe(false);
  });

  it("accepts updating just the name", () => {
    expect(UpdateBatchRequestSchema.safeParse({ name: "Renamed" }).success).toBe(true);
  });
});

describe("UpdateBatchStatusRequestSchema", () => {
  it("accepts a valid status", () => {
    expect(UpdateBatchStatusRequestSchema.safeParse({ status: "ARCHIVED" }).success).toBe(true);
  });

  it("rejects an invalid status", () => {
    expect(UpdateBatchStatusRequestSchema.safeParse({ status: "DELETED" }).success).toBe(false);
  });
});

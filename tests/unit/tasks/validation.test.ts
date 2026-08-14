import { describe, expect, it } from "vitest";
import {
  AddTaskCommentRequestSchema,
  CreateTaskRequestSchema,
  ReassignTaskRequestSchema,
  SearchTasksQuerySchema,
  SetTaskStatusRequestSchema,
  UpdateTaskRequestSchema,
} from "../../../src/modules/tasks/presentation/validation";

describe("CreateTaskRequestSchema — invalid input", () => {
  it("rejects a missing title", () => {
    expect(CreateTaskRequestSchema.safeParse({ ownerId: "11111111-1111-1111-1111-111111111111" }).success).toBe(false);
  });

  it("rejects a non-UUID ownerId", () => {
    expect(CreateTaskRequestSchema.safeParse({ title: "x", ownerId: "not-a-uuid" }).success).toBe(false);
  });

  it("rejects an invalid priority value", () => {
    expect(
      CreateTaskRequestSchema.safeParse({
        title: "x",
        ownerId: "11111111-1111-1111-1111-111111111111",
        priority: "SUPER_URGENT",
      }).success,
    ).toBe(false);
  });

  it("accepts a minimal valid payload", () => {
    expect(
      CreateTaskRequestSchema.safeParse({ title: "Fix the leak", ownerId: "11111111-1111-1111-1111-111111111111" }).success,
    ).toBe(true);
  });
});

describe("UpdateTaskRequestSchema — invalid input", () => {
  it("rejects an empty object (no field provided)", () => {
    expect(UpdateTaskRequestSchema.safeParse({}).success).toBe(false);
  });

  it("accepts a single-field update", () => {
    expect(UpdateTaskRequestSchema.safeParse({ priority: "HIGH" }).success).toBe(true);
  });

  it("allows explicitly clearing the deadline with null", () => {
    expect(UpdateTaskRequestSchema.safeParse({ deadline: null }).success).toBe(true);
  });
});

describe("ReassignTaskRequestSchema — invalid input", () => {
  it("rejects a missing newOwnerId", () => {
    expect(ReassignTaskRequestSchema.safeParse({}).success).toBe(false);
  });

  it("rejects a non-UUID newOwnerId", () => {
    expect(ReassignTaskRequestSchema.safeParse({ newOwnerId: "nope" }).success).toBe(false);
  });
});

describe("SetTaskStatusRequestSchema — invalid input", () => {
  it("rejects TODO — only reachable via create/reopen, never this endpoint", () => {
    expect(SetTaskStatusRequestSchema.safeParse({ status: "TODO" }).success).toBe(false);
  });

  it("rejects an unknown status string", () => {
    expect(SetTaskStatusRequestSchema.safeParse({ status: "ARCHIVED" }).success).toBe(false);
  });

  it("accepts every real forward-transition target", () => {
    for (const status of ["IN_PROGRESS", "BLOCKED", "DONE", "CANCELLED"]) {
      expect(SetTaskStatusRequestSchema.safeParse({ status }).success).toBe(true);
    }
  });
});

describe("AddTaskCommentRequestSchema — invalid input", () => {
  it("rejects an empty body", () => {
    expect(AddTaskCommentRequestSchema.safeParse({ body: "" }).success).toBe(false);
  });

  it("rejects a whitespace-only body (trimmed before length check)", () => {
    expect(AddTaskCommentRequestSchema.safeParse({ body: "   " }).success).toBe(false);
  });

  it("accepts a real comment", () => {
    expect(AddTaskCommentRequestSchema.safeParse({ body: "Working on it" }).success).toBe(true);
  });
});

describe("SearchTasksQuerySchema — invalid input", () => {
  it("rejects a pageSize above the maximum", () => {
    expect(SearchTasksQuerySchema.safeParse({ pageSize: "500" }).success).toBe(false);
  });

  it("rejects page 0 (1-indexed)", () => {
    expect(SearchTasksQuerySchema.safeParse({ page: "0" }).success).toBe(false);
  });

  it("rejects an invalid status filter", () => {
    expect(SearchTasksQuerySchema.safeParse({ status: "ARCHIVED" }).success).toBe(false);
  });

  it("accepts an empty query (no filters)", () => {
    expect(SearchTasksQuerySchema.safeParse({}).success).toBe(true);
  });
});

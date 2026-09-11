import { describe, expect, it } from "vitest";
import { RequestChangesRequestSchema, SaveDraftRequestSchema } from "../../../src/modules/profiles/presentation/validation";

describe("SaveDraftRequestSchema", () => {
  it("accepts a partial update with just a bio", () => {
    expect(SaveDraftRequestSchema.safeParse({ bio: "Hello" }).success).toBe(true);
  });

  it("rejects a completely empty payload", () => {
    expect(SaveDraftRequestSchema.safeParse({}).success).toBe(false);
  });

  it("rejects an invalid portfolio link (not a URL)", () => {
    const result = SaveDraftRequestSchema.safeParse({ portfolioLinks: ["not-a-url"] });
    expect(result.success).toBe(false);
  });

  it("accepts valid selectedProjects entries", () => {
    const result = SaveDraftRequestSchema.safeParse({
      selectedProjects: [{ title: "Studio Project 1", description: "A pavilion design" }],
    });
    expect(result.success).toBe(true);
  });

  it("rejects a selectedProjects entry missing a title", () => {
    const result = SaveDraftRequestSchema.safeParse({
      selectedProjects: [{ description: "missing title" }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects resumeFileId because resumes use the dedicated protected upload route", () => {
    expect(SaveDraftRequestSchema.safeParse({ resumeFileId: null }).success).toBe(false);
  });

  it("rejects a non-UUID resumeFileId", () => {
    expect(SaveDraftRequestSchema.safeParse({ resumeFileId: "not-a-uuid" }).success).toBe(false);
  });
});

describe("RequestChangesRequestSchema", () => {
  it("accepts a non-empty comment", () => {
    expect(RequestChangesRequestSchema.safeParse({ reviewComment: "Please fix X" }).success).toBe(true);
  });

  it("rejects an empty comment", () => {
    expect(RequestChangesRequestSchema.safeParse({ reviewComment: "" }).success).toBe(false);
  });

  it("rejects a whitespace-only comment (trimmed to empty)", () => {
    expect(RequestChangesRequestSchema.safeParse({ reviewComment: "   " }).success).toBe(false);
  });

  it("rejects a missing comment field", () => {
    expect(RequestChangesRequestSchema.safeParse({}).success).toBe(false);
  });
});

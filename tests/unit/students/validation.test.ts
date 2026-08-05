import { describe, expect, it } from "vitest";
import {
  AttachConfidentialDocumentRequestSchema,
  CreateStudentRequestSchema,
  SearchStudentsQuerySchema,
  UpdateStudentRequestSchema,
} from "../../../src/modules/students/presentation/validation";

describe("CreateStudentRequestSchema", () => {
  const valid = {
    email: "student@example.edu",
    fullName: "Jane Doe",
    rollNumber: "BA2026001",
    batchId: "550e8400-e29b-41d4-a716-446655440000",
  };

  it("accepts a valid payload", () => {
    expect(CreateStudentRequestSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects an invalid email", () => {
    const result = CreateStudentRequestSchema.safeParse({ ...valid, email: "not-an-email" });
    expect(result.success).toBe(false);
  });

  it("rejects a missing fullName", () => {
    const { fullName: _fullName, ...withoutName } = valid;
    const result = CreateStudentRequestSchema.safeParse(withoutName);
    expect(result.success).toBe(false);
  });

  it("rejects an empty rollNumber", () => {
    const result = CreateStudentRequestSchema.safeParse({ ...valid, rollNumber: "" });
    expect(result.success).toBe(false);
  });

  it("rejects a non-UUID batchId", () => {
    const result = CreateStudentRequestSchema.safeParse({ ...valid, batchId: "not-a-uuid" });
    expect(result.success).toBe(false);
  });

  it("rejects CGPA out of the 0–10 range", () => {
    const result = CreateStudentRequestSchema.safeParse({
      ...valid,
      private: { cgpa: 11 },
    });
    expect(result.success).toBe(false);
  });

  it("accepts a valid CGPA and allows clearing nullable private fields", () => {
    const result = CreateStudentRequestSchema.safeParse({
      ...valid,
      private: { cgpa: 8.75, backlogDetails: null },
    });
    expect(result.success).toBe(true);
  });
});

describe("UpdateStudentRequestSchema", () => {
  it("rejects a completely empty update", () => {
    expect(UpdateStudentRequestSchema.safeParse({}).success).toBe(false);
  });

  it("accepts an update with only one field set", () => {
    expect(UpdateStudentRequestSchema.safeParse({ fullName: "New Name" }).success).toBe(true);
  });

  it("rejects an invalid batchId format", () => {
    expect(UpdateStudentRequestSchema.safeParse({ batchId: "abc" }).success).toBe(false);
  });
});

describe("SearchStudentsQuerySchema", () => {
  it("parses a comma-separated skills query param into an array", () => {
    const result = SearchStudentsQuerySchema.safeParse({ skills: "Rhino, Revit" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.skills).toEqual(["Rhino", "Revit"]);
    }
  });

  it("coerces cgpaMin/cgpaMax from query strings to numbers", () => {
    const result = SearchStudentsQuerySchema.safeParse({ cgpaMin: "7", cgpaMax: "9" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.cgpaMin).toBe(7);
      expect(result.data.cgpaMax).toBe(9);
    }
  });

  it("rejects an invalid batchStatus value", () => {
    const result = SearchStudentsQuerySchema.safeParse({ batchStatus: "NOT_A_STATUS" });
    expect(result.success).toBe(false);
  });
});

describe("AttachConfidentialDocumentRequestSchema", () => {
  const valid = { storageKey: "students/1/doc.pdf", mimeType: "application/pdf", sizeBytes: 1024 };

  it("accepts a valid payload", () => {
    expect(AttachConfidentialDocumentRequestSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects a file exceeding the size ceiling", () => {
    const result = AttachConfidentialDocumentRequestSchema.safeParse({
      ...valid,
      sizeBytes: 100 * 1024 * 1024,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a zero/negative size", () => {
    expect(AttachConfidentialDocumentRequestSchema.safeParse({ ...valid, sizeBytes: 0 }).success).toBe(
      false,
    );
  });

  it("accepts every allow-listed MIME type (PDF, JPEG, PNG)", () => {
    for (const mimeType of ["application/pdf", "image/jpeg", "image/png"]) {
      expect(AttachConfidentialDocumentRequestSchema.safeParse({ ...valid, mimeType }).success).toBe(true);
    }
  });

  it("rejects a MIME type outside the allow-list (NFR-SEC-06 — allow-list, not deny-list)", () => {
    for (const mimeType of ["application/x-msdownload", "text/html", "application/octet-stream", "image/svg+xml"]) {
      expect(AttachConfidentialDocumentRequestSchema.safeParse({ ...valid, mimeType }).success).toBe(false);
    }
  });
});

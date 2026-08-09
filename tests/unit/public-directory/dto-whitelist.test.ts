/**
 * Regression test for §18 point 2/3 of docs/planning/V4_0_PRD.md: the
 * public directory's DTO must only ever contain an explicit whitelist of
 * fields, cgpa must only ever be populated when the row's own showCgpa flag
 * is true (never trusted from anywhere else), and no other
 * StudentPrivateProfile field may ever leak through a careless future join
 * — mirrors tests/unit/recruiters/dto-whitelist.test.ts's exact discipline,
 * applied to this new, even-more-sensitive unauthenticated surface.
 */
import { describe, expect, it } from "vitest";
import { toDTO } from "../../../src/modules/public-directory/infrastructure/prisma-public-directory-repository";

const EXPECTED_DTO_KEYS = [
  "studentId",
  "fullName",
  "batchId",
  "batchName",
  "bio",
  "skills",
  "software",
  "selectedProjects",
  "portfolioLinks",
  "certifications",
  "internships",
  "hasResume",
  "profilePhotoUrl",
  "cgpa",
].sort();

const FORBIDDEN_PRIVATE_FIELD_NAMES = [
  "hasActiveBacklog",
  "backlogDetails",
  "phone",
  "personalEmail",
  "internalRemarks",
  "confidentialDocuments",
  "updatedByUserId",
];

function buildRow(overrides: { showCgpa?: boolean; avatarFileId?: string | null } = {}) {
  return {
    id: "published-1",
    studentProfileId: "student-1",
    bio: "A public bio",
    skills: ["Rendering"],
    software: ["Rhino"],
    selectedProjects: [],
    portfolioLinks: ["https://example.com"],
    resumeFileId: "file-1",
    certifications: [],
    internships: [],
    isPubliclyDiscoverable: true,
    showCgpa: overrides.showCgpa ?? false,
    publishedFromDraftId: "draft-1",
    publishedAt: new Date(),
    publishedByUserId: "sec-1",
    studentProfile: {
      id: "student-1",
      userId: "user-1",
      batchId: "batch-a",
      rollNumber: "BA001",
      fullName: "Alice Architect",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      batch: {
        id: "batch-a",
        name: "B.Arch 2026",
        year: 2026,
        status: "ACTIVE",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      user: {
        id: "user-1",
        email: "alice@vnit.ac.in",
        avatarFileId: overrides.avatarFileId === undefined ? null : overrides.avatarFileId,
      },
      // Simulates a hypothetical future regression: a widened `include`
      // that accidentally pulls the private profile alongside identity data.
      privateProfile: {
        cgpa: { toNumber: () => 9.5 },
        hasActiveBacklog: true,
        backlogDetails: "One pending backlog in Structures",
        phone: "9999999999",
        personalEmail: "alice.private@example.com",
        internalRemarks: "Flagged for a scholarship interview",
        confidentialDocuments: [{ storageKey: "confidential/alice-id-proof.pdf" }],
        updatedByUserId: "sec-1",
      },
    },
  };
}

describe("public-directory toDTO — whitelist enforcement (regression)", () => {
  it("returns exactly the whitelisted DTO keys, even when the input row carries extra private-profile-shaped data", () => {
    const dto = toDTO(buildRow() as any);
    expect(Object.keys(dto).sort()).toEqual(EXPECTED_DTO_KEYS);
  });

  it("never surfaces any forbidden private-field name as a key on the mapped DTO", () => {
    const dto = toDTO(buildRow() as any);
    const dtoKeys = Object.keys(dto);
    for (const forbidden of FORBIDDEN_PRIVATE_FIELD_NAMES) {
      expect(dtoKeys).not.toContain(forbidden);
    }
  });

  it("never surfaces private field values anywhere in the serialized DTO output", () => {
    const dto = toDTO(buildRow() as any);
    const serialized = JSON.stringify(dto);
    expect(serialized).not.toContain("9999999999");
    expect(serialized).not.toContain("alice.private@example.com");
    expect(serialized).not.toContain("Flagged for a scholarship interview");
    expect(serialized).not.toContain("Structures");
    expect(serialized).not.toContain("confidential/alice-id-proof.pdf");
  });

  it("keeps cgpa null when the student's own showCgpa flag is false, even though the joined row has a real cgpa value", () => {
    const dto = toDTO(buildRow({ showCgpa: false }) as any);
    expect(dto.cgpa).toBeNull();
  });

  it("surfaces cgpa as a plain number only when showCgpa is true", () => {
    const dto = toDTO(buildRow({ showCgpa: true }) as any);
    expect(dto.cgpa).toBe(9.5);
  });

  it("resolves profilePhotoUrl from the reused User.avatarFileId (A5), null when unset", () => {
    expect(toDTO(buildRow({ avatarFileId: null }) as any).profilePhotoUrl).toBeNull();
    expect(toDTO(buildRow({ avatarFileId: "file-99" }) as any).profilePhotoUrl).toBe("/api/files/file-99");
  });

  it("sets hasResume to false when resumeFileId is null, without exposing the file field itself", () => {
    const row = { ...buildRow(), resumeFileId: null };
    const dto = toDTO(row as any);
    expect(dto.hasResume).toBe(false);
    expect(Object.keys(dto)).not.toContain("resumeFileId");
  });
});

/**
 * Regression test for the Days 8–9 "PUBLIC DTO" requirement: recruiter API
 * responses must only ever contain an explicit whitelist of fields, and a
 * future addition to StudentPublicProfile — or a careless future join that
 * accidentally pulls in private-profile-shaped data — must never
 * automatically appear in a recruiter response.
 *
 * This feeds `toDTO` a row shaped like a legitimate Prisma payload but with
 * EXTRA fields attached, as if some future change accidentally widened the
 * query's `include` to also pull private data. `toDTO` never spreads its
 * input (`...row`) — it reads named fields only — so the assertion here is
 * on the OUTPUT's own key set, which must be exactly the DTO's fixed shape
 * no matter what the input contained.
 */
import { describe, expect, it } from "vitest";
import { toDTO } from "../../../src/modules/recruiters/infrastructure/prisma-recruiter-directory-repository";

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
  "isSaved",
  "isShortlisted",
  "interestStatus",
].sort();

const FORBIDDEN_PRIVATE_FIELD_NAMES = [
  "cgpa",
  "hasActiveBacklog",
  "backlogDetails",
  "phone",
  "personalEmail",
  "internalRemarks",
  "confidentialDocuments",
  "updatedByUserId",
];

function buildRowWithLeakedPrivateFields() {
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
        avatarFileId: null,
      },
      // Simulates a hypothetical future regression: a widened `include`
      // that accidentally pulls the private profile alongside identity data.
      privateProfile: {
        cgpa: 9.5,
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

describe("recruiters toDTO — whitelist enforcement (regression)", () => {
  it("returns exactly the whitelisted DTO keys, even when the input row carries extra private-profile-shaped data", () => {
    const maliciousRow = buildRowWithLeakedPrivateFields() as any;
    const dto = toDTO(maliciousRow);

    expect(Object.keys(dto).sort()).toEqual(EXPECTED_DTO_KEYS);
  });

  it("never surfaces any private-field name as a key on the mapped DTO", () => {
    const maliciousRow = buildRowWithLeakedPrivateFields() as any;
    const dto = toDTO(maliciousRow);

    const dtoKeys = Object.keys(dto);
    for (const forbidden of FORBIDDEN_PRIVATE_FIELD_NAMES) {
      expect(dtoKeys).not.toContain(forbidden);
    }
  });

  it("never surfaces private field values anywhere in the serialized DTO output", () => {
    const maliciousRow = buildRowWithLeakedPrivateFields() as any;
    const dto = toDTO(maliciousRow);
    const serialized = JSON.stringify(dto);

    expect(serialized).not.toContain("9999999999");
    expect(serialized).not.toContain("alice.private@example.com");
    expect(serialized).not.toContain("Flagged for a scholarship interview");
    expect(serialized).not.toContain("Structures");
    expect(serialized).not.toContain("confidential/alice-id-proof.pdf");
  });

  it("maps exactly the approved public fields correctly (positive mapping check)", () => {
    const row = buildRowWithLeakedPrivateFields() as any;
    const dto = toDTO(row);

    expect(dto).toEqual({
      studentId: "student-1",
      fullName: "Alice Architect",
      batchId: "batch-a",
      batchName: "B.Arch 2026",
      bio: "A public bio",
      skills: ["Rendering"],
      software: ["Rhino"],
      selectedProjects: [],
      portfolioLinks: ["https://example.com"],
      certifications: [],
      internships: [],
      hasResume: true,
      profilePhotoUrl: null,
      isSaved: false,
      isShortlisted: false,
      interestStatus: null,
    });
  });

  it("resolves profilePhotoUrl from the reused User.avatarFileId (A5), null when unset", () => {
    const row = buildRowWithLeakedPrivateFields() as any;
    row.studentProfile.user.avatarFileId = "file-99";
    expect(toDTO(row).profilePhotoUrl).toBe("/api/files/file-99");
  });

  it("sets hasResume to false when resumeFileId is null, without exposing the file field itself", () => {
    const row = { ...buildRowWithLeakedPrivateFields(), resumeFileId: null };
    const dto = toDTO(row as any);

    expect(dto.hasResume).toBe(false);
    expect(Object.keys(dto)).not.toContain("resumeFileId");
  });
});

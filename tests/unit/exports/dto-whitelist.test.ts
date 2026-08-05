/**
 * Regression suite for Day 10's "no object spreading, explicit mapping,
 * future DB fields must never automatically appear" requirement — same
 * technique as tests/unit/recruiters/dto-whitelist.test.ts (Days 8–9): feed
 * each mapper a row shaped like a legitimate Prisma payload but with EXTRA
 * fields attached (passwordHash, JWTs, private-profile-shaped data,
 * draft/approval metadata), as if a future change accidentally widened a
 * query's `include`. None of the four mappers spread their input, so the
 * assertion is on the OUTPUT's own key set and serialized content.
 */
import { describe, expect, it } from "vitest";
import { toRow as toStudentDirectoryRow } from "../../../src/modules/exports/infrastructure/prisma-student-directory-export-repository";
import { toRow as toBatchReportRow } from "../../../src/modules/exports/infrastructure/prisma-batch-report-export-repository";
import { toRow as toPublicPlacementRow } from "../../../src/modules/exports/infrastructure/prisma-public-placement-export-repository";
import { toRow as toRecruiterDirectoryRow } from "../../../src/modules/exports/infrastructure/prisma-recruiter-directory-export-repository";

const FORBIDDEN_STRINGS = [
  "$2b$12$fakehash", // bcrypt-shaped password hash
  "eyJhbGciOiJIUzI1NiJ9.fake.jwt", // JWT-shaped string
  "refresh-token-secret-value",
  "9999999999", // phone
  "personal.email@example.com",
  "9.5", // CGPA
  "One pending backlog",
  "Flagged for scholarship review", // internal remarks
  "confidential/id-proof.pdf",
];

describe("exports DTO whitelist — StudentDirectoryRow", () => {
  function buildMaliciousRow() {
    return {
      id: "sp-1",
      fullName: "Alice Architect",
      rollNumber: "BA001",
      batchId: "batch-a",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      userId: "user-1",
      batch: { id: "batch-a", name: "B.Arch 2026", year: 2026, status: "ACTIVE", createdAt: new Date(), updatedAt: new Date() },
      user: {
        id: "user-1",
        email: "alice@vnit.ac.in",
        passwordHash: "$2b$12$fakehash",
        role: "STUDENT",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      publicProfile: {
        id: "pp-1",
        studentProfileId: "sp-1",
        bio: "Aspiring architect",
        skills: ["Rendering"],
        software: ["Rhino"],
        selectedProjects: [],
        portfolioLinks: ["https://alice.design"],
        resumeFileId: "file-1",
        certifications: [],
        internships: [],
        publishedFromDraftId: "draft-1",
        publishedAt: new Date(),
        publishedByUserId: "sec-1",
      },
      draft: null,
      // Simulates a hypothetical future regression: private data leaking
      // into the same query result.
      privateProfile: {
        cgpa: 9.5,
        hasActiveBacklog: true,
        backlogDetails: "One pending backlog",
        phone: "9999999999",
        personalEmail: "personal.email@example.com",
        internalRemarks: "Flagged for scholarship review",
        confidentialDocuments: [{ storageKey: "confidential/id-proof.pdf" }],
      },
    };
  }

  it("returns exactly the whitelisted keys", () => {
    const dto = toStudentDirectoryRow(buildMaliciousRow() as any);
    expect(Object.keys(dto).sort()).toEqual(
      ["fullName", "rollNumber", "batchName", "instituteEmail", "skills", "software", "resumeAvailable", "portfolioAvailable", "activeStatus"].sort(),
    );
  });

  it("never contains a password hash, private field, or confidential document reference anywhere in the serialized output", () => {
    const dto = toStudentDirectoryRow(buildMaliciousRow() as any);
    const serialized = JSON.stringify(dto);
    for (const forbidden of FORBIDDEN_STRINGS) {
      expect(serialized).not.toContain(forbidden);
    }
  });

  it("maps the institute email from User.email, not personalEmail", () => {
    const dto = toStudentDirectoryRow(buildMaliciousRow() as any);
    expect(dto.instituteEmail).toBe("alice@vnit.ac.in");
  });
});

describe("exports DTO whitelist — BatchReportRow", () => {
  it("returns exactly the whitelisted keys and no per-student PII", () => {
    const batch = {
      id: "batch-a",
      name: "B.Arch 2026",
      year: 2026,
      status: "ACTIVE" as const,
      createdAt: new Date(),
      updatedAt: new Date(),
      students: [
        { isActive: true, fullName: "Alice", rollNumber: "BA001" },
        { isActive: false, fullName: "Bob", rollNumber: "BA002" },
      ],
    };

    const dto = toBatchReportRow(batch as any);
    expect(Object.keys(dto).sort()).toEqual(
      ["batchName", "status", "totalStudents", "activeStudents", "archivedStudents"].sort(),
    );
    expect(JSON.stringify(dto)).not.toContain("Alice");
    expect(dto).toEqual({
      batchName: "B.Arch 2026",
      status: "ACTIVE",
      totalStudents: 2,
      activeStudents: 1,
      archivedStudents: 1,
    });
  });
});

describe("exports DTO whitelist — PublicPlacementRow", () => {
  function buildMaliciousRow() {
    return {
      id: "pp-1",
      studentProfileId: "sp-1",
      bio: "Aspiring architect",
      skills: ["Rendering"],
      software: ["Rhino"],
      selectedProjects: [],
      portfolioLinks: ["https://alice.design"],
      resumeFileId: "file-1",
      certifications: [{ title: "LEED Green Associate" }],
      internships: [{ company: "Studio X" }],
      publishedFromDraftId: "draft-1",
      publishedAt: new Date(),
      publishedByUserId: "sec-1",
      studentProfile: {
        id: "sp-1",
        fullName: "Alice Architect",
        rollNumber: "BA001",
        batchId: "batch-a",
        isActive: true,
        batch: { id: "batch-a", name: "B.Arch 2026", year: 2026, status: "ACTIVE" },
        // Simulates a hypothetical regression pulling in a sibling draft or private profile.
        privateProfile: { cgpa: 9.5, phone: "9999999999", internalRemarks: "Flagged for scholarship review" },
      },
    };
  }

  it("returns exactly the whitelisted keys — never draft/approval-status/private fields", () => {
    const dto = toPublicPlacementRow(buildMaliciousRow() as any);
    expect(Object.keys(dto).sort()).toEqual(
      ["fullName", "batchName", "bio", "skills", "software", "certifications", "internshipExperience", "portfolioLinks", "resumeAvailable"].sort(),
    );
  });

  it("never leaks private-profile-shaped data in the serialized output", () => {
    const dto = toPublicPlacementRow(buildMaliciousRow() as any);
    const serialized = JSON.stringify(dto);
    expect(serialized).not.toContain("9999999999");
    expect(serialized).not.toContain("Flagged for scholarship review");
    expect(serialized).not.toContain("9.5");
  });

  it("flattens certifications/internships to plain string arrays (titles/companies only)", () => {
    const dto = toPublicPlacementRow(buildMaliciousRow() as any);
    expect(dto.certifications).toEqual(["LEED Green Associate"]);
    expect(dto.internshipExperience).toEqual(["Studio X"]);
  });
});

describe("exports DTO whitelist — RecruiterDirectoryRow", () => {
  it("returns exactly the whitelisted keys", () => {
    const row = {
      id: "rp-1",
      userId: "user-1",
      fullName: "Jordan Recruiter",
      companyName: "Studio Example",
      user: {
        id: "user-1",
        email: "jordan@studio-example.com",
        passwordHash: "$2b$12$fakehash",
        role: "RECRUITER",
        isActive: true,
      },
    };

    const dto = toRecruiterDirectoryRow(row as any);
    expect(Object.keys(dto).sort()).toEqual(["company", "contactPerson", "officialEmail", "activeDrives"].sort());
  });

  it("never leaks the password hash", () => {
    const row = {
      id: "rp-1",
      userId: "user-1",
      fullName: "Jordan Recruiter",
      companyName: "Studio Example",
      user: { id: "user-1", email: "jordan@studio-example.com", passwordHash: "$2b$12$fakehash", role: "RECRUITER", isActive: true },
    };

    const dto = toRecruiterDirectoryRow(row as any);
    expect(JSON.stringify(dto)).not.toContain("$2b$12$fakehash");
  });

  it("always reports activeDrives as 0 (no PlacementDrive entity exists yet)", () => {
    const row = {
      id: "rp-1",
      userId: "user-1",
      fullName: "Jordan Recruiter",
      companyName: "Studio Example",
      user: { id: "user-1", email: "jordan@studio-example.com", passwordHash: "x", role: "RECRUITER", isActive: true },
    };
    const dto = toRecruiterDirectoryRow(row as any);
    expect(dto.activeDrives).toBe(0);
  });
});

import { beforeEach, describe, expect, it } from "vitest";
import type { AuthenticatedActor } from "../../../src/modules/auth";
import type { RecruiterStudentProfileDTO } from "../../../src/modules/recruiters/domain/entities";
import { SearchDirectoryUseCase } from "../../../src/modules/recruiters/application/use-cases/search-directory";
import { NotAuthorizedError } from "../../../src/lib/errors";
import { InMemoryRecruiterDirectoryRepository } from "../../support/fakes/in-memory-recruiter-directory-repository";
import { InMemoryRecruiterInteractionRepository } from "../../support/fakes/in-memory-recruiter-interaction-repository";
import { InMemoryRecruiterInterestRepository } from "../../support/fakes/in-memory-recruiter-interest-repository";
import { FakeRecruiterSelfLookup } from "../../support/fakes/fake-recruiter-self-lookup";

const recruiter: AuthenticatedActor = { userId: "rec-1", role: "RECRUITER" };
const secretary: AuthenticatedActor = { userId: "sec-1", role: "SECRETARY" };
const coordinator: AuthenticatedActor = { userId: "coord-1", role: "COORDINATOR", batchScope: ["batch-a"] };
const student: AuthenticatedActor = { userId: "stu-1", role: "STUDENT", studentProfileId: "student-1" };

function profile(overrides: Partial<RecruiterStudentProfileDTO>): RecruiterStudentProfileDTO {
  return {
    studentId: "student-1",
    fullName: "Alice Architect",
    batchId: "batch-a",
    batchName: "B.Arch 2026",
    bio: "Aspiring architect",
    skills: ["Rendering"],
    software: ["Rhino"],
    selectedProjects: [],
    portfolioLinks: [],
    certifications: [],
    internships: [],
    hasResume: true,
    profilePhotoUrl: null,
    isSaved: false,
    isShortlisted: false,
    interestStatus: null,
    ...overrides,
  };
}

describe("SearchDirectoryUseCase", () => {
  let repo: InMemoryRecruiterDirectoryRepository;
  let useCase: SearchDirectoryUseCase;

  beforeEach(() => {
    repo = new InMemoryRecruiterDirectoryRepository();
    useCase = new SearchDirectoryUseCase({
      directoryRepository: repo,
      interactionRepository: new InMemoryRecruiterInteractionRepository(),
      interestRepository: new InMemoryRecruiterInterestRepository(),
      recruiterSelfLookup: new FakeRecruiterSelfLookup(),
    });

    repo.seedApproved(profile({ studentId: "s1", fullName: "Alice Architect", batchId: "batch-a", skills: ["Rendering"], software: ["Rhino"] }));
    repo.seedApproved(
      profile({
        studentId: "s2",
        fullName: "Bob Builder",
        batchId: "batch-b",
        skills: ["Modeling"],
        software: ["AutoCAD"],
        internships: [{ company: "Studio X", role: "Intern" }],
      }),
    );
    repo.seedApproved(
      profile({
        studentId: "s3",
        fullName: "Carol Craftsperson",
        batchId: "batch-a",
        skills: ["Rendering"],
        software: ["SketchUp"],
        certifications: [{ title: "LEED Green Associate" }],
      }),
    );
  });

  it("allows a Recruiter to search", async () => {
    const results = await useCase.execute({ actor: recruiter, filters: {} });
    expect(results).toHaveLength(3);
  });

  it("denies the Secretary (this is the recruiter-only directory, not the admin one)", async () => {
    await expect(useCase.execute({ actor: secretary, filters: {} })).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  it("denies a Coordinator", async () => {
    await expect(useCase.execute({ actor: coordinator, filters: {} })).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  it("denies a Student", async () => {
    await expect(useCase.execute({ actor: student, filters: {} })).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  it("filters by batch (graduation batch)", async () => {
    const results = await useCase.execute({ actor: recruiter, filters: { batchId: "batch-a" } });
    expect(results.map((r) => r.fullName).sort()).toEqual(["Alice Architect", "Carol Craftsperson"]);
  });

  it("filters by skills", async () => {
    const results = await useCase.execute({ actor: recruiter, filters: { skills: ["Modeling"] } });
    expect(results.map((r) => r.fullName)).toEqual(["Bob Builder"]);
  });

  it("filters by software", async () => {
    const results = await useCase.execute({ actor: recruiter, filters: { software: ["SketchUp"] } });
    expect(results.map((r) => r.fullName)).toEqual(["Carol Craftsperson"]);
  });

  it("filters by internship experience", async () => {
    const results = await useCase.execute({ actor: recruiter, filters: { hasInternshipExperience: true } });
    expect(results.map((r) => r.fullName)).toEqual(["Bob Builder"]);
  });

  it("filters by internship keyword", async () => {
    const results = await useCase.execute({ actor: recruiter, filters: { internshipKeyword: "studio x" } });
    expect(results.map((r) => r.fullName)).toEqual(["Bob Builder"]);
  });

  it("filters by certification presence", async () => {
    const results = await useCase.execute({ actor: recruiter, filters: { hasCertification: true } });
    expect(results.map((r) => r.fullName)).toEqual(["Carol Craftsperson"]);
  });

  it("filters by certification keyword", async () => {
    const results = await useCase.execute({ actor: recruiter, filters: { certificationKeyword: "leed" } });
    expect(results.map((r) => r.fullName)).toEqual(["Carol Craftsperson"]);
  });

  it("free-text search matches name", async () => {
    const results = await useCase.execute({ actor: recruiter, filters: { query: "bob" } });
    expect(results.map((r) => r.fullName)).toEqual(["Bob Builder"]);
  });

  it("free-text search matches skills", async () => {
    const results = await useCase.execute({ actor: recruiter, filters: { query: "rendering" } });
    expect(results.map((r) => r.fullName).sort()).toEqual(["Alice Architect", "Carol Craftsperson"]);
  });

  it("free-text search matches certifications", async () => {
    const results = await useCase.execute({ actor: recruiter, filters: { query: "green associate" } });
    expect(results.map((r) => r.fullName)).toEqual(["Carol Craftsperson"]);
  });

  it("merges the requesting recruiter's own save/shortlist state onto each result (V4.0 C1)", async () => {
    const interactionRepository = new InMemoryRecruiterInteractionRepository();
    const recruiterSelfLookup = new FakeRecruiterSelfLookup();
    recruiterSelfLookup.seed("rec-1", "recruiter-profile-1");
    interactionRepository.seed("recruiter-profile-1", { studentProfileId: "s1", isSaved: true, isShortlisted: true });
    const scopedUseCase = new SearchDirectoryUseCase({
      directoryRepository: repo,
      interactionRepository,
      interestRepository: new InMemoryRecruiterInterestRepository(),
      recruiterSelfLookup,
    });

    const results = await scopedUseCase.execute({ actor: recruiter, filters: {} });
    const alice = results.find((r) => r.studentId === "s1")!;
    const bob = results.find((r) => r.studentId === "s2")!;
    expect(alice.isSaved).toBe(true);
    expect(alice.isShortlisted).toBe(true);
    expect(bob.isSaved).toBe(false);
    expect(bob.isShortlisted).toBe(false);
  });

  it("defaults isSaved/isShortlisted to false for a recruiter with no RecruiterProfile row resolvable (defensive, should not happen in practice)", async () => {
    const results = await useCase.execute({ actor: recruiter, filters: {} });
    expect(results.every((r) => r.isSaved === false && r.isShortlisted === false)).toBe(true);
  });
});

import { beforeEach, describe, expect, it } from "vitest";
import type { AuthenticatedActor } from "../../../src/modules/auth";
import { CreateAlumniUseCase } from "../../../src/modules/alumni/application/use-cases/create-alumni";
import { UpdateAlumniUseCase } from "../../../src/modules/alumni/application/use-cases/update-alumni";
import { DeleteAlumniUseCase } from "../../../src/modules/alumni/application/use-cases/delete-alumni";
import { SearchAlumniUseCase } from "../../../src/modules/alumni/application/use-cases/search-alumni";
import { GetAlumniUseCase } from "../../../src/modules/alumni/application/use-cases/get-alumni";
import { AlumniNotFoundError, DuplicateAlumniLinkError } from "../../../src/modules/alumni/domain/errors";
import { NotAuthorizedError } from "../../../src/lib/errors";
import { InMemoryAlumniRepository } from "../../support/fakes/in-memory-alumni-repository";
import { FakeAuditRecorder } from "../../support/fakes/fake-audit-recorder";

const secretary: AuthenticatedActor = { userId: "sec-1", role: "SECRETARY" };
const coordinator: AuthenticatedActor = { userId: "coord-1", role: "COORDINATOR", batchScope: ["batch-a"] };
const student: AuthenticatedActor = { userId: "stu-1", role: "STUDENT", studentProfileId: "s1" };
const recruiter: AuthenticatedActor = { userId: "rec-1", role: "RECRUITER" };

describe("Alumni CRUD use cases (V4.0 D5 — both Secretary and Coordinator get identical Full access)", () => {
  let alumniRepository: InMemoryAlumniRepository;
  let auditRecorder: FakeAuditRecorder;
  let createUseCase: CreateAlumniUseCase;
  let updateUseCase: UpdateAlumniUseCase;
  let deleteUseCase: DeleteAlumniUseCase;
  let searchUseCase: SearchAlumniUseCase;
  let getUseCase: GetAlumniUseCase;

  beforeEach(() => {
    alumniRepository = new InMemoryAlumniRepository();
    auditRecorder = new FakeAuditRecorder();
    createUseCase = new CreateAlumniUseCase({ alumniRepository, auditRecorder });
    updateUseCase = new UpdateAlumniUseCase({ alumniRepository, auditRecorder });
    deleteUseCase = new DeleteAlumniUseCase({ alumniRepository, auditRecorder });
    searchUseCase = new SearchAlumniUseCase({ alumniRepository });
    getUseCase = new GetAlumniUseCase({ alumniRepository });
  });

  describe("CreateAlumniUseCase", () => {
    it("creates a record for a Secretary", async () => {
      const alumni = await createUseCase.execute({
        actor: secretary,
        fullName: "Priya Iyer",
        graduationYear: 2020,
        mentorshipAvailable: true,
      });
      expect(alumni.fullName).toBe("Priya Iyer");
      expect(alumni.mentorshipAvailable).toBe(true);
    });

    it("creates a record for a Coordinator — identical authority to Secretary, no scoping", async () => {
      const alumni = await createUseCase.execute({ actor: coordinator, fullName: "Rahul Verma", graduationYear: 2019 });
      expect(alumni.fullName).toBe("Rahul Verma");
    });

    it("denies a Student and a Recruiter", async () => {
      await expect(
        createUseCase.execute({ actor: student, fullName: "x", graduationYear: 2020 }),
      ).rejects.toBeInstanceOf(NotAuthorizedError);
      await expect(
        createUseCase.execute({ actor: recruiter, fullName: "x", graduationYear: 2020 }),
      ).rejects.toBeInstanceOf(NotAuthorizedError);
    });

    it("rejects linking the same student profile to two alumni records", async () => {
      await createUseCase.execute({ actor: secretary, fullName: "First", graduationYear: 2020, studentProfileId: "student-1" });
      await expect(
        createUseCase.execute({ actor: secretary, fullName: "Second", graduationYear: 2021, studentProfileId: "student-1" }),
      ).rejects.toBeInstanceOf(DuplicateAlumniLinkError);
    });

    it("records an ALUMNI_CREATED audit entry", async () => {
      const alumni = await createUseCase.execute({ actor: secretary, fullName: "Priya Iyer", graduationYear: 2020 });
      expect(auditRecorder.entries[0]).toMatchObject({ action: "ALUMNI_CREATED", targetEntityId: alumni.id });
    });
  });

  describe("UpdateAlumniUseCase", () => {
    it("updates a record for a Coordinator", async () => {
      const alumni = await createUseCase.execute({ actor: secretary, fullName: "Priya Iyer", graduationYear: 2020 });
      const updated = await updateUseCase.execute({ actor: coordinator, alumniId: alumni.id, currentCompany: "Acme" });
      expect(updated.currentCompany).toBe("Acme");
    });

    it("denies a Student", async () => {
      const alumni = await createUseCase.execute({ actor: secretary, fullName: "Priya Iyer", graduationYear: 2020 });
      await expect(
        updateUseCase.execute({ actor: student, alumniId: alumni.id, currentCompany: "Acme" }),
      ).rejects.toBeInstanceOf(NotAuthorizedError);
    });

    it("throws AlumniNotFoundError for an unknown id", async () => {
      await expect(
        updateUseCase.execute({ actor: secretary, alumniId: "unknown", currentCompany: "Acme" }),
      ).rejects.toBeInstanceOf(AlumniNotFoundError);
    });
  });

  describe("DeleteAlumniUseCase", () => {
    it("deletes a record for a Secretary", async () => {
      const alumni = await createUseCase.execute({ actor: secretary, fullName: "Priya Iyer", graduationYear: 2020 });
      await deleteUseCase.execute({ actor: secretary, alumniId: alumni.id });
      expect(await alumniRepository.findById(alumni.id)).toBeNull();
    });

    it("denies a Recruiter", async () => {
      const alumni = await createUseCase.execute({ actor: secretary, fullName: "Priya Iyer", graduationYear: 2020 });
      await expect(deleteUseCase.execute({ actor: recruiter, alumniId: alumni.id })).rejects.toBeInstanceOf(
        NotAuthorizedError,
      );
    });

    it("throws AlumniNotFoundError for an unknown id", async () => {
      await expect(deleteUseCase.execute({ actor: secretary, alumniId: "unknown" })).rejects.toBeInstanceOf(
        AlumniNotFoundError,
      );
    });
  });

  describe("SearchAlumniUseCase", () => {
    beforeEach(async () => {
      await createUseCase.execute({ actor: secretary, fullName: "Priya Iyer", graduationYear: 2020, mentorshipAvailable: true });
      await createUseCase.execute({ actor: secretary, fullName: "Rahul Verma", graduationYear: 2019, mentorshipAvailable: false });
    });

    it("filters by mentorshipAvailable", async () => {
      const results = await searchUseCase.execute({ actor: secretary, filters: { mentorshipAvailable: true } });
      expect(results.map((r) => r.fullName)).toEqual(["Priya Iyer"]);
    });

    it("filters by graduationYear", async () => {
      const results = await searchUseCase.execute({ actor: coordinator, filters: { graduationYear: 2019 } });
      expect(results.map((r) => r.fullName)).toEqual(["Rahul Verma"]);
    });

    it("denies a Student", async () => {
      await expect(searchUseCase.execute({ actor: student, filters: {} })).rejects.toBeInstanceOf(NotAuthorizedError);
    });
  });

  describe("GetAlumniUseCase", () => {
    it("returns a record for a Coordinator", async () => {
      const alumni = await createUseCase.execute({ actor: secretary, fullName: "Priya Iyer", graduationYear: 2020 });
      const result = await getUseCase.execute({ actor: coordinator, alumniId: alumni.id });
      expect(result.id).toBe(alumni.id);
    });

    it("throws AlumniNotFoundError for an unknown id", async () => {
      await expect(getUseCase.execute({ actor: secretary, alumniId: "unknown" })).rejects.toBeInstanceOf(
        AlumniNotFoundError,
      );
    });
  });
});

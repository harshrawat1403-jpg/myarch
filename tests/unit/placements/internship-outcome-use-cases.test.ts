import { beforeEach, describe, expect, it } from "vitest";
import type { AuthenticatedActor } from "../../../src/modules/auth";
import { GetInternshipOutcomeUseCase } from "../../../src/modules/placements/application/use-cases/get-internship-outcome";
import { UpdateInternshipOutcomeUseCase } from "../../../src/modules/placements/application/use-cases/update-internship-outcome";
import { SubmitStudentFeedbackUseCase } from "../../../src/modules/placements/application/use-cases/submit-student-feedback";
import {
  ApplicationNotFoundError,
  InternshipOutcomeNotFoundError,
} from "../../../src/modules/placements/domain/errors";
import { NotAuthorizedError } from "../../../src/lib/errors";
import { InMemoryApplicationRepository } from "../../support/fakes/in-memory-application-repository";
import { InMemoryInternshipOutcomeRepository } from "../../support/fakes/in-memory-internship-outcome-repository";
import { FakeStudentEligibilityLookup } from "../../support/fakes/fake-student-eligibility-lookup";

const owner: AuthenticatedActor = { userId: "stu-1", role: "STUDENT", studentProfileId: "s1" };
const otherStudent: AuthenticatedActor = { userId: "stu-2", role: "STUDENT", studentProfileId: "s2" };
const secretary: AuthenticatedActor = { userId: "sec-1", role: "SECRETARY" };
const scopedCoordinator: AuthenticatedActor = { userId: "coord-1", role: "COORDINATOR", batchScope: ["batch-a"] };
const unscopedCoordinator: AuthenticatedActor = { userId: "coord-2", role: "COORDINATOR", batchScope: ["batch-z"] };

describe("GetInternshipOutcomeUseCase / UpdateInternshipOutcomeUseCase / SubmitStudentFeedbackUseCase", () => {
  let applicationRepository: InMemoryApplicationRepository;
  let internshipOutcomeRepository: InMemoryInternshipOutcomeRepository;
  let studentEligibilityLookup: FakeStudentEligibilityLookup;
  let getUseCase: GetInternshipOutcomeUseCase;
  let updateUseCase: UpdateInternshipOutcomeUseCase;
  let feedbackUseCase: SubmitStudentFeedbackUseCase;

  beforeEach(async () => {
    applicationRepository = new InMemoryApplicationRepository();
    await applicationRepository.create("s1", "drive-a");
    internshipOutcomeRepository = new InMemoryInternshipOutcomeRepository();
    studentEligibilityLookup = new FakeStudentEligibilityLookup();
    studentEligibilityLookup.seed("s1", {
      userId: "user-batch-a",
      batchId: "batch-a",
      batchName: "B.Arch 2026",
      fullName: "Test Student",
      cgpa: 8.0,
      hasActiveBacklog: false,
    });
    getUseCase = new GetInternshipOutcomeUseCase({ applicationRepository, internshipOutcomeRepository, studentEligibilityLookup });
    updateUseCase = new UpdateInternshipOutcomeUseCase({ applicationRepository, internshipOutcomeRepository, studentEligibilityLookup });
    feedbackUseCase = new SubmitStudentFeedbackUseCase({ applicationRepository, internshipOutcomeRepository });
  });

  describe("GetInternshipOutcomeUseCase", () => {
    it("throws InternshipOutcomeNotFoundError before ACTIVE is reached", async () => {
      const applications = await applicationRepository.listForStudent("s1");
      await expect(getUseCase.execute({ actor: owner, applicationId: applications[0]!.id })).rejects.toBeInstanceOf(
        InternshipOutcomeNotFoundError,
      );
    });

    it("allows the owning Student once an outcome exists", async () => {
      const applications = await applicationRepository.listForStudent("s1");
      await internshipOutcomeRepository.create(applications[0]!.id);
      const result = await getUseCase.execute({ actor: owner, applicationId: applications[0]!.id });
      expect(result.applicationId).toBe(applications[0]!.id);
    });

    it("denies another Student", async () => {
      const applications = await applicationRepository.listForStudent("s1");
      await internshipOutcomeRepository.create(applications[0]!.id);
      await expect(getUseCase.execute({ actor: otherStudent, applicationId: applications[0]!.id })).rejects.toBeInstanceOf(
        NotAuthorizedError,
      );
    });

    it("allows a Coordinator scoped to the applicant's batch", async () => {
      const applications = await applicationRepository.listForStudent("s1");
      await internshipOutcomeRepository.create(applications[0]!.id);
      const result = await getUseCase.execute({ actor: scopedCoordinator, applicationId: applications[0]!.id });
      expect(result.applicationId).toBe(applications[0]!.id);
    });

    it("throws ApplicationNotFoundError for an unknown application", async () => {
      await expect(getUseCase.execute({ actor: secretary, applicationId: "unknown" })).rejects.toBeInstanceOf(
        ApplicationNotFoundError,
      );
    });
  });

  describe("UpdateInternshipOutcomeUseCase", () => {
    it("sets companyFeedback for a Secretary once an outcome exists", async () => {
      const applications = await applicationRepository.listForStudent("s1");
      await internshipOutcomeRepository.create(applications[0]!.id);
      const result = await updateUseCase.execute({
        actor: secretary,
        applicationId: applications[0]!.id,
        companyFeedback: "Excellent performance.",
      });
      expect(result.companyFeedback).toBe("Excellent performance.");
    });

    it("denies a Coordinator not scoped to the applicant's batch", async () => {
      const applications = await applicationRepository.listForStudent("s1");
      await internshipOutcomeRepository.create(applications[0]!.id);
      await expect(
        updateUseCase.execute({ actor: unscopedCoordinator, applicationId: applications[0]!.id, companyFeedback: "x" }),
      ).rejects.toBeInstanceOf(NotAuthorizedError);
    });

    it("denies a Student", async () => {
      const applications = await applicationRepository.listForStudent("s1");
      await internshipOutcomeRepository.create(applications[0]!.id);
      await expect(
        updateUseCase.execute({ actor: owner, applicationId: applications[0]!.id, companyFeedback: "x" }),
      ).rejects.toBeInstanceOf(NotAuthorizedError);
    });

    it("throws InternshipOutcomeNotFoundError before ACTIVE is reached", async () => {
      const applications = await applicationRepository.listForStudent("s1");
      await expect(
        updateUseCase.execute({ actor: secretary, applicationId: applications[0]!.id, companyFeedback: "x" }),
      ).rejects.toBeInstanceOf(InternshipOutcomeNotFoundError);
    });
  });

  describe("SubmitStudentFeedbackUseCase", () => {
    it("sets studentFeedback for the owning Student", async () => {
      const applications = await applicationRepository.listForStudent("s1");
      await internshipOutcomeRepository.create(applications[0]!.id);
      const result = await feedbackUseCase.execute({
        actor: owner,
        applicationId: applications[0]!.id,
        studentFeedback: "Great learning experience.",
      });
      expect(result.studentFeedback).toBe("Great learning experience.");
    });

    it("denies another Student", async () => {
      const applications = await applicationRepository.listForStudent("s1");
      await internshipOutcomeRepository.create(applications[0]!.id);
      await expect(
        feedbackUseCase.execute({ actor: otherStudent, applicationId: applications[0]!.id, studentFeedback: "x" }),
      ).rejects.toBeInstanceOf(NotAuthorizedError);
    });

    it("denies a Secretary", async () => {
      const applications = await applicationRepository.listForStudent("s1");
      await internshipOutcomeRepository.create(applications[0]!.id);
      await expect(
        feedbackUseCase.execute({ actor: secretary, applicationId: applications[0]!.id, studentFeedback: "x" }),
      ).rejects.toBeInstanceOf(NotAuthorizedError);
    });

    it("throws InternshipOutcomeNotFoundError before ACTIVE is reached", async () => {
      const applications = await applicationRepository.listForStudent("s1");
      await expect(
        feedbackUseCase.execute({ actor: owner, applicationId: applications[0]!.id, studentFeedback: "x" }),
      ).rejects.toBeInstanceOf(InternshipOutcomeNotFoundError);
    });
  });
});

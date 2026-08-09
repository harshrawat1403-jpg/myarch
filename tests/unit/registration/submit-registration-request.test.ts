import { beforeEach, describe, expect, it } from "vitest";
import { SubmitRegistrationRequestUseCase } from "../../../src/modules/registration/application/use-cases/submit-registration-request";
import {
  DuplicateRegistrationEmailError,
  DuplicateRegistrationRollNumberError,
  RegistrationBatchNotFoundError,
  RegistrationBatchNotOpenError,
} from "../../../src/modules/registration/domain/errors";
import { InMemoryRegistrationRequestRepository } from "../../support/fakes/in-memory-registration-request-repository";
import { InMemoryBatchLookup } from "../../support/fakes/in-memory-batch-lookup";
import { FakeExistingAccountLookup } from "../../support/fakes/fake-existing-account-lookup";
import { FakeRegistrationReviewerLookup } from "../../support/fakes/fake-registration-reviewer-lookup";
import { FakeNotificationService } from "../../support/fakes/fake-notification-service";

const ACTIVE_BATCH = "batch-active";
const GRADUATED_BATCH = "batch-graduated";

function buildContext() {
  const registrationRequestRepository = new InMemoryRegistrationRequestRepository();
  const batchLookup = new InMemoryBatchLookup();
  const existingAccountLookup = new FakeExistingAccountLookup();
  const reviewerLookup = new FakeRegistrationReviewerLookup();
  const notificationService = new FakeNotificationService();
  batchLookup.seed(ACTIVE_BATCH, "ACTIVE", "B.Arch 2027");
  batchLookup.seed(GRADUATED_BATCH, "GRADUATED");
  reviewerLookup.seedReviewers(ACTIVE_BATCH, ["coord-1", "sec-1"]);

  const useCase = new SubmitRegistrationRequestUseCase({
    registrationRequestRepository,
    batchLookup,
    existingAccountLookup,
    reviewerLookup,
    notificationService,
  });

  return { useCase, registrationRequestRepository, batchLookup, existingAccountLookup, reviewerLookup, notificationService };
}

const VALID_INPUT = {
  email: "prospective@example.com",
  fullName: "Priya New Student",
  rollNumber: "BA2027099",
  batchId: ACTIVE_BATCH,
};

describe("SubmitRegistrationRequestUseCase", () => {
  let ctx: ReturnType<typeof buildContext>;

  beforeEach(() => {
    ctx = buildContext();
  });

  it("creates a SUBMITTED request for a valid, unique application", async () => {
    const request = await ctx.useCase.execute(VALID_INPUT);
    expect(request.status).toBe("SUBMITTED");
    expect(request.email).toBe("prospective@example.com");
  });

  it("normalizes email to lowercase and trims fields", async () => {
    const request = await ctx.useCase.execute({ ...VALID_INPUT, email: "  Prospective@Example.com  " });
    expect(request.email).toBe("prospective@example.com");
  });

  it("stores self-reported submittedData", async () => {
    const request = await ctx.useCase.execute({
      ...VALID_INPUT,
      submittedData: { phone: "9876543210", personalEmail: "p@x.com", notes: "Transfer student" },
    });
    expect(request.submittedData).toEqual({ phone: "9876543210", personalEmail: "p@x.com", notes: "Transfer student" });
  });

  it("throws RegistrationBatchNotFoundError for an unknown batch", async () => {
    await expect(ctx.useCase.execute({ ...VALID_INPUT, batchId: "missing" })).rejects.toBeInstanceOf(
      RegistrationBatchNotFoundError,
    );
  });

  it("rejects a GRADUATED batch (stricter than CreateStudentUseCase's own ARCHIVED-only check — registration is for prospective students, not roster backfill)", async () => {
    await expect(
      ctx.useCase.execute({ ...VALID_INPUT, batchId: GRADUATED_BATCH }),
    ).rejects.toBeInstanceOf(RegistrationBatchNotOpenError);
  });

  it("rejects an email already belonging to a real account", async () => {
    ctx.existingAccountLookup.seedEmail("prospective@example.com");
    await expect(ctx.useCase.execute(VALID_INPUT)).rejects.toBeInstanceOf(DuplicateRegistrationEmailError);
  });

  it("rejects a roll number already belonging to a real account", async () => {
    ctx.existingAccountLookup.seedRollNumber("BA2027099");
    await expect(ctx.useCase.execute(VALID_INPUT)).rejects.toBeInstanceOf(DuplicateRegistrationRollNumberError);
  });

  it("rejects a second application with the same email while one is still pending", async () => {
    await ctx.useCase.execute(VALID_INPUT);
    await expect(
      ctx.useCase.execute({ ...VALID_INPUT, rollNumber: "BA2027100" }),
    ).rejects.toBeInstanceOf(DuplicateRegistrationEmailError);
  });

  it("rejects a second application with the same roll number while one is still pending", async () => {
    await ctx.useCase.execute(VALID_INPUT);
    await expect(
      ctx.useCase.execute({ ...VALID_INPUT, email: "other@example.com" }),
    ).rejects.toBeInstanceOf(DuplicateRegistrationRollNumberError);
  });

  it("V4.0 E2 — notifies every reviewer scoped to the batch (REGISTRATION_SUBMITTED)", async () => {
    await ctx.useCase.execute(VALID_INPUT);

    expect(ctx.notificationService.sent).toHaveLength(2);
    expect(ctx.notificationService.sent).toContainEqual(
      expect.objectContaining({
        recipientUserId: "coord-1",
        template: "REGISTRATION_SUBMITTED",
        context: { applicantName: "Priya New Student", batchName: "B.Arch 2027" },
      }),
    );
    expect(ctx.notificationService.sent).toContainEqual(expect.objectContaining({ recipientUserId: "sec-1" }));
  });
});

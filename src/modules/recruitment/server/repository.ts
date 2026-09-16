import { Prisma, type RecruitmentApplicationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { evaluateOpportunityEligibility, type EligibilityResult } from "./eligibility";
import { isValidRecruitmentApplicationTransition } from "./lifecycle";

export class RecruitmentConflictError extends Error {}
export class RecruitmentNotFoundError extends Error {}
export class RecruitmentEligibilityError extends Error {
  constructor(readonly result: EligibilityResult) {
    super("You are not eligible for this opportunity");
  }
}
export class InvalidRecruitmentTransitionError extends Error {}

export function isDuplicateRecruitmentApplicationError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

export async function findCompanyMembership(userId: string, companyId: string) {
  return prisma.recruiterCompanyMembership.findUnique({ where: { userId_companyId: { userId, companyId } } });
}

export async function createRecruitmentApplication(studentProfileId: string, opportunityId: string) {
  try {
    return await prisma.$transaction(async (tx) => {
      const [opportunity, student] = await Promise.all([
        tx.recruitmentOpportunity.findUnique({ where: { id: opportunityId } }),
        tx.studentProfile.findUnique({
          where: { id: studentProfileId },
          select: { batchId: true, privateProfile: { select: { cgpa: true } } },
        }),
      ]);
      if (!opportunity || !student) throw new RecruitmentNotFoundError("Opportunity or student not found");
      const eligibility = evaluateOpportunityEligibility(
        {
          status: opportunity.status,
          deadline: opportunity.deadline,
          minimumCgpa: opportunity.minimumCgpa === null ? null : Number(opportunity.minimumCgpa),
          eligibleBatchIds: opportunity.eligibleBatchIds,
          eligibleProgramCodes: opportunity.eligibleProgramCodes,
        },
        { batchId: student.batchId, programCode: null, cgpa: student.privateProfile?.cgpa === null || student.privateProfile?.cgpa === undefined ? null : Number(student.privateProfile.cgpa) },
      );
      if (!eligibility.eligible) throw new RecruitmentEligibilityError(eligibility);
      const resume = await tx.talentDocument.findFirst({
        where: { kind: "RESUME", talentProfile: { studentProfileId } },
        select: { fileId: true },
      });
      return tx.recruitmentApplication.create({
        data: { studentProfileId, opportunityId, submittedResumeFileId: resume?.fileId ?? null },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 5000, timeout: 10000 });
  } catch (error) {
    if (isDuplicateRecruitmentApplicationError(error)) {
      throw new RecruitmentConflictError("You have already applied to this opportunity");
    }
    throw error;
  }
}

export async function transitionRecruitmentApplication(
  applicationId: string,
  toStatus: RecruitmentApplicationStatus,
  changedByUserId: string,
  note: string | null,
) {
  return prisma.$transaction(async (tx) => {
    const application = await tx.recruitmentApplication.findUnique({ where: { id: applicationId } });
    if (!application) throw new RecruitmentNotFoundError("Application not found");
    if (!isValidRecruitmentApplicationTransition(application.currentStatus, toStatus)) {
      throw new InvalidRecruitmentTransitionError("This application status transition is not allowed");
    }
    const updated = await tx.recruitmentApplication.updateMany({
      where: { id: application.id, currentStatus: application.currentStatus },
      data: { currentStatus: toStatus },
    });
    if (updated.count !== 1) throw new RecruitmentConflictError("Application was updated by another request");
    await tx.recruitmentApplicationStatusHistory.create({
      data: { recruitmentApplicationId: application.id, fromStatus: application.currentStatus, toStatus, note, changedByUserId },
    });
    return tx.recruitmentApplication.findUniqueOrThrow({ where: { id: application.id } });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 5000, timeout: 10000 });
}

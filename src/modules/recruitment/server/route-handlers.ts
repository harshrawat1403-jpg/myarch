import { NextResponse, type NextRequest } from "next/server";
import { withAuth } from "@/modules/auth";
import { PrismaAuditRecorder } from "@/lib/audit";
import { badRequest, conflict, forbidden, notFound } from "@/lib/http-errors";
import { prisma } from "@/lib/prisma";
import { extractRouteParam } from "@/lib/route-params";
import { canEditOpportunityDraft, canManageRecruitment, canPublishRecruitmentOpportunity, canRecordPlacementOutcome, canViewApplicant } from "@/modules/platform";
import { AddCompanyMembershipSchema, CreateOpportunitySchema, CreateRecruitingCompanySchema, PlacementOutcomeSchema, UpdateRecruitmentApplicationStatusSchema } from "./validation";
import { createRecruitmentApplication, findCompanyMembership, InvalidRecruitmentTransitionError, RecruitmentConflictError, RecruitmentEligibilityError, RecruitmentNotFoundError, transitionRecruitmentApplication } from "./repository";

const audit = new PrismaAuditRecorder(prisma);

export const createRecruitingCompanyRouteHandler = withAuth(async (req, { actor }) => {
  if (!canManageRecruitment(actor)) return forbidden("Not authorized to create recruiting companies");
  const parsed = CreateRecruitingCompanySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest("Invalid recruiting company", parsed.error.flatten().fieldErrors);
  const company = await prisma.recruitingCompany.create({ data: parsed.data }).catch(() => null);
  if (!company) return conflict("A recruiting company with this name already exists");
  await audit.record({ actorUserId: actor.userId, action: "RECRUITING_COMPANY_CREATED", targetEntityType: "RecruitingCompany", targetEntityId: company.id });
  return NextResponse.json({ data: company }, { status: 201 });
}, { roles: ["SECRETARY", "COORDINATOR"] });

export const addCompanyMembershipRouteHandler = withAuth(async (req, { actor }, routeContext) => {
  const companyId = await extractRouteParam(routeContext, "companyId");
  if (!companyId || !canManageRecruitment(actor)) return forbidden("Not authorized to manage company memberships");
  const parsed = AddCompanyMembershipSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest("Invalid company membership", parsed.error.flatten().fieldErrors);
  const membership = await prisma.recruiterCompanyMembership.upsert({
    where: { userId_companyId: { userId: parsed.data.userId, companyId } },
    create: { userId: parsed.data.userId, companyId, role: parsed.data.role },
    update: { role: parsed.data.role },
  }).catch(() => null);
  if (!membership) return notFound("Company or recruiter account not found");
  await audit.record({ actorUserId: actor.userId, action: "RECRUITER_COMPANY_MEMBERSHIP_SET", targetEntityType: "RecruitingCompany", targetEntityId: companyId, metadata: { memberUserId: parsed.data.userId, role: parsed.data.role } });
  return NextResponse.json({ data: membership });
}, { roles: ["SECRETARY", "COORDINATOR"] });

export const createOpportunityRouteHandler = withAuth(async (req, { actor }) => {
  const parsed = CreateOpportunitySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest("Invalid opportunity", parsed.error.flatten().fieldErrors);
  const membership = await findCompanyMembership(actor.userId, parsed.data.companyId);
  if (!canEditOpportunityDraft(actor, membership)) return forbidden("Not authorized to create opportunities for this company");
  const opportunity = await prisma.recruitmentOpportunity.create({ data: { ...parsed.data, createdByUserId: actor.userId } }).catch(() => null);
  if (!opportunity) return notFound("Recruiting company not found");
  await audit.record({ actorUserId: actor.userId, action: "RECRUITMENT_OPPORTUNITY_CREATED", targetEntityType: "RecruitmentOpportunity", targetEntityId: opportunity.id });
  return NextResponse.json({ data: opportunity }, { status: 201 });
}, { roles: ["SECRETARY", "COORDINATOR", "RECRUITER"] });

export const openOpportunityRouteHandler = withAuth(async (_req, { actor }, routeContext) => {
  if (!canPublishRecruitmentOpportunity(actor)) return forbidden("Only TNP administrators can open opportunities");
  const opportunityId = await extractRouteParam(routeContext, "opportunityId");
  if (!opportunityId) return notFound("Opportunity not found");
  const opportunity = await prisma.recruitmentOpportunity.update({ where: { id: opportunityId }, data: { status: "OPEN" } }).catch(() => null);
  if (!opportunity) return notFound("Opportunity not found");
  await audit.record({ actorUserId: actor.userId, action: "RECRUITMENT_OPPORTUNITY_OPENED", targetEntityType: "RecruitmentOpportunity", targetEntityId: opportunity.id });
  return NextResponse.json({ data: opportunity });
}, { roles: ["SECRETARY", "COORDINATOR"] });

export const listOpenOpportunitiesRouteHandler = withAuth(async () => {
  const now = new Date();
  const opportunities = await prisma.recruitmentOpportunity.findMany({
    where: { status: "OPEN", OR: [{ deadline: null }, { deadline: { gt: now } }], company: { isActive: true } },
    select: { id: true, title: true, type: true, location: true, workMode: true, deadline: true, company: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ data: opportunities });
}, { roles: ["STUDENT"] });

export const applyToOpportunityRouteHandler = withAuth(async (_req, { actor }, routeContext) => {
  if (!actor.studentProfileId) return forbidden("Only students can apply to opportunities");
  const opportunityId = await extractRouteParam(routeContext, "opportunityId");
  if (!opportunityId) return notFound("Opportunity not found");
  try {
    const application = await createRecruitmentApplication(actor.studentProfileId, opportunityId);
    return NextResponse.json({ data: application }, { status: 201 });
  } catch (error) {
    if (error instanceof RecruitmentNotFoundError) return notFound(error.message);
    if (error instanceof RecruitmentEligibilityError) return forbidden(error.message);
    if (error instanceof RecruitmentConflictError) return conflict(error.message);
    throw error;
  }
}, { roles: ["STUDENT"] });

export const listOpportunityApplicantsRouteHandler = withAuth(async (_req, { actor }, routeContext) => {
  const opportunityId = await extractRouteParam(routeContext, "opportunityId");
  if (!opportunityId) return notFound("Opportunity not found");
  const opportunity = await prisma.recruitmentOpportunity.findUnique({ where: { id: opportunityId }, select: { companyId: true } });
  if (!opportunity) return notFound("Opportunity not found");
  const membership = await findCompanyMembership(actor.userId, opportunity.companyId);
  if (!canViewApplicant(actor, membership)) return forbidden("Not authorized to view these applicants");
  const applications = await prisma.recruitmentApplication.findMany({
    where: { opportunityId },
    select: { id: true, currentStatus: true, appliedAt: true, studentProfile: { select: { fullName: true } } },
    orderBy: { appliedAt: "asc" },
  });
  return NextResponse.json({ data: applications });
}, { roles: ["SECRETARY", "COORDINATOR", "RECRUITER"] });

export const updateRecruitmentApplicationStatusRouteHandler = withAuth(async (req, { actor }, routeContext) => {
  const applicationId = await extractRouteParam(routeContext, "applicationId");
  if (!applicationId) return notFound("Application not found");
  const parsed = UpdateRecruitmentApplicationStatusSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest("Invalid application status update", parsed.error.flatten().fieldErrors);
  const application = await prisma.recruitmentApplication.findUnique({ where: { id: applicationId }, select: { opportunity: { select: { companyId: true } } } });
  if (!application) return notFound("Application not found");
  const membership = await findCompanyMembership(actor.userId, application.opportunity.companyId);
  if (!canViewApplicant(actor, membership)) return forbidden("Not authorized to update this application");
  try {
    const updated = await transitionRecruitmentApplication(applicationId, parsed.data.status, actor.userId, parsed.data.note ?? null);
    await audit.record({ actorUserId: actor.userId, action: "RECRUITMENT_APPLICATION_STATUS_CHANGED", targetEntityType: "RecruitmentApplication", targetEntityId: applicationId, metadata: { status: parsed.data.status } });
    return NextResponse.json({ data: updated });
  } catch (error) {
    if (error instanceof RecruitmentNotFoundError) return notFound(error.message);
    if (error instanceof RecruitmentConflictError) return conflict(error.message);
    if (error instanceof InvalidRecruitmentTransitionError) return conflict(error.message);
    throw error;
  }
}, { roles: ["SECRETARY", "COORDINATOR", "RECRUITER"] });

export const withdrawRecruitmentApplicationRouteHandler = withAuth(async (_req, { actor }, routeContext) => {
  const applicationId = await extractRouteParam(routeContext, "applicationId");
  if (!applicationId || !actor.studentProfileId) return notFound("Application not found");
  const application = await prisma.recruitmentApplication.findUnique({ where: { id: applicationId }, select: { studentProfileId: true } });
  if (!application) return notFound("Application not found");
  if (application.studentProfileId !== actor.studentProfileId) return forbidden("Not authorized to withdraw this application");
  try {
    const updated = await transitionRecruitmentApplication(applicationId, "WITHDRAWN", actor.userId, null);
    return NextResponse.json({ data: updated });
  } catch (error) {
    if (error instanceof RecruitmentConflictError || error instanceof InvalidRecruitmentTransitionError) return conflict(error.message);
    throw error;
  }
}, { roles: ["STUDENT"] });

export const upsertPlacementOutcomeRouteHandler = withAuth(async (req, { actor }, routeContext) => {
  if (!canRecordPlacementOutcome(actor)) return forbidden("Only TNP administrators can record official placement outcomes");
  const studentProfileId = await extractRouteParam(routeContext, "studentProfileId");
  if (!studentProfileId) return notFound("Student not found");
  const parsed = PlacementOutcomeSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest("Invalid placement outcome", parsed.error.flatten().fieldErrors);
  const outcome = await prisma.recruitmentPlacementOutcome.upsert({
    where: { studentProfileId },
    create: { studentProfileId, recordedByUserId: actor.userId, ...parsed.data },
    update: { recordedByUserId: actor.userId, ...parsed.data },
  }).catch(() => null);
  if (!outcome) return notFound("Student or recruiting company not found");
  await audit.record({ actorUserId: actor.userId, action: "RECRUITMENT_PLACEMENT_OUTCOME_RECORDED", targetEntityType: "RecruitmentPlacementOutcome", targetEntityId: outcome.id });
  return NextResponse.json({ data: outcome });
}, { roles: ["SECRETARY", "COORDINATOR"] });

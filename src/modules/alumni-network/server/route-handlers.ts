import { NextResponse, type NextRequest } from "next/server";
import { getIssueEmailVerificationTokenUseCase, hashPassword, withAuth } from "@/modules/auth";
import { PrismaAuditRecorder } from "@/lib/audit";
import { badRequest, conflict, forbidden, notFound } from "@/lib/http-errors";
import { prisma } from "@/lib/prisma";
import { extractRouteParam } from "@/lib/route-params";
import { canApproveAlumni, canEditOwnAlumniProfile, canManageAlumni } from "@/modules/platform";
import { createSelfRegisteringAlumni, AlumniNetworkConflictError, getOwnAlumniNetworkProfile, listVisibleAlumniNetworkProfiles, updateOwnAlumniNetworkProfile } from "./repository";
import { AlumniProfileUpdateSchema, AlumniSelfSignupSchema, CreateImportedAlumniSchema } from "./validation";

const audit = new PrismaAuditRecorder(prisma);

export async function signupAlumniNetworkRouteHandler(req: NextRequest): Promise<Response> {
  const parsed = AlumniSelfSignupSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest("Invalid alumni registration", parsed.error.flatten().fieldErrors);
  const email = parsed.data.email.trim().toLowerCase();
  try {
    const profile = await createSelfRegisteringAlumni({
      email,
      passwordHash: await hashPassword(parsed.data.password),
      fullName: parsed.data.fullName,
      graduationYear: parsed.data.graduationYear,
      program: parsed.data.program ?? null,
    });
    await audit.record({ actorUserId: profile.userId!, action: "ALUMNI_NETWORK_SELF_REGISTERED", targetEntityType: "AlumniNetworkProfile", targetEntityId: profile.id });
    await getIssueEmailVerificationTokenUseCase().execute({ email, recipientName: profile.fullName, userId: profile.userId! });
    return NextResponse.json({ data: { id: profile.id, approvalStatus: profile.approvalStatus } }, { status: 201 });
  } catch (error) {
    if (error instanceof AlumniNetworkConflictError) return conflict(error.message);
    throw error;
  }
}

export const getOwnAlumniNetworkProfileRouteHandler = withAuth(async (_req, { actor }) => {
  const profile = await getOwnAlumniNetworkProfile(actor.userId);
  return profile ? NextResponse.json({ data: profile }) : notFound("Alumni profile not found");
}, { roles: ["ALUMNI"] });

export const updateOwnAlumniNetworkProfileRouteHandler = withAuth(async (req, { actor }) => {
  const profile = await getOwnAlumniNetworkProfile(actor.userId);
  if (!profile || !canEditOwnAlumniProfile(actor, profile.userId)) return forbidden("Not authorized to edit this alumni profile");
  const parsed = AlumniProfileUpdateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest("Invalid alumni profile", parsed.error.flatten().fieldErrors);
  const updated = await updateOwnAlumniNetworkProfile(actor.userId, parsed.data);
  return NextResponse.json({ data: updated });
}, { roles: ["ALUMNI"] });

export const listAlumniDirectoryRouteHandler = withAuth(async () => {
  const profiles = await listVisibleAlumniNetworkProfiles();
  return NextResponse.json({ data: profiles });
}, { roles: ["SECRETARY", "COORDINATOR", "STUDENT", "ALUMNI", "RECRUITER"] });

export const createImportedAlumniRouteHandler = withAuth(async (req, { actor }) => {
  if (!canManageAlumni(actor)) return forbidden("Not authorized to import alumni profiles");
  const parsed = CreateImportedAlumniSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest("Invalid alumni profile", parsed.error.flatten().fieldErrors);
  const profile = await prisma.alumniNetworkProfile.create({
    data: { ...parsed.data, approvalStatus: "APPROVED", visibility: "HIDDEN" },
  }).catch(() => null);
  if (!profile) return conflict("An alumni profile already uses this email");
  await audit.record({ actorUserId: actor.userId, action: "ALUMNI_NETWORK_IMPORTED", targetEntityType: "AlumniNetworkProfile", targetEntityId: profile.id });
  return NextResponse.json({ data: profile }, { status: 201 });
}, { roles: ["SECRETARY", "COORDINATOR"] });

export const approveAlumniNetworkRouteHandler = withAuth(async (_req, { actor }, routeContext) => {
  if (!canApproveAlumni(actor)) return forbidden("Only administrators can approve alumni profiles");
  const profileId = await extractRouteParam(routeContext, "profileId");
  if (!profileId) return notFound("Alumni profile not found");
  const profile = await prisma.$transaction(async (tx) => {
    const existing = await tx.alumniNetworkProfile.findUnique({ where: { id: profileId } });
    if (!existing) return null;
    const updated = await tx.alumniNetworkProfile.update({ where: { id: profileId }, data: { approvalStatus: "APPROVED" } });
    if (existing.userId) await tx.user.update({ where: { id: existing.userId }, data: { isActive: true } });
    return updated;
  });
  if (!profile) return notFound("Alumni profile not found");
  await audit.record({ actorUserId: actor.userId, action: "ALUMNI_NETWORK_APPROVED", targetEntityType: "AlumniNetworkProfile", targetEntityId: profile.id });
  return NextResponse.json({ data: profile });
}, { roles: ["SECRETARY"] });

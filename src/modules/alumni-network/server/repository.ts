import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export class AlumniNetworkConflictError extends Error {}

export async function createSelfRegisteringAlumni(input: {
  email: string;
  passwordHash: string;
  fullName: string;
  graduationYear: number;
  program: string | null;
}) {
  try {
    return await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { email: input.email, passwordHash: input.passwordHash, role: "ALUMNI", isActive: false, mustChangePassword: false },
      });
      return tx.alumniNetworkProfile.create({
        data: {
          userId: user.id,
          email: input.email,
          fullName: input.fullName,
          graduationYear: input.graduationYear,
          program: input.program,
          approvalStatus: "PENDING",
          visibility: "HIDDEN",
        },
      });
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new AlumniNetworkConflictError("An alumni account or profile already uses this email");
    }
    throw error;
  }
}

export async function getOwnAlumniNetworkProfile(userId: string) {
  return prisma.alumniNetworkProfile.findUnique({ where: { userId } });
}

export async function updateOwnAlumniNetworkProfile(userId: string, data: Prisma.AlumniNetworkProfileUpdateInput) {
  return prisma.alumniNetworkProfile.update({ where: { userId }, data });
}

export async function listVisibleAlumniNetworkProfiles() {
  return prisma.alumniNetworkProfile.findMany({
    where: { approvalStatus: "APPROVED", visibility: "DIRECTORY" },
    select: {
      id: true,
      fullName: true,
      graduationYear: true,
      program: true,
      currentCompany: true,
      currentRole: true,
      industry: true,
      city: true,
      linkedInUrl: true,
      websiteUrl: true,
      bio: true,
      expertise: true,
      mentorshipAvailable: true,
      contributionOptIn: true,
    },
    orderBy: [{ graduationYear: "desc" }, { fullName: "asc" }],
  });
}

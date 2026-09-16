import type { TalentProfileVisibility } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { calculateTalentProfileCompleteness } from "./profile-completeness";

export interface TalentProfileInput {
  readonly professionalHeadline?: string | null;
  readonly bio?: string | null;
  readonly specialization?: string | null;
  readonly interests?: string[];
  readonly linkedInUrl?: string | null;
  readonly behanceUrl?: string | null;
  readonly portfolioWebsiteUrl?: string | null;
  readonly visibility?: TalentProfileVisibility;
  readonly resumeVisible?: boolean;
  readonly cgpaVisible?: boolean;
  readonly contactVisible?: boolean;
  readonly placementAvailable?: boolean;
  readonly internshipAvailable?: boolean;
}

const ownProfileInclude = {
  skills: { orderBy: { name: "asc" as const } },
  projects: { orderBy: { sortOrder: "asc" as const } },
  documents: true,
  studentProfile: { select: { user: { select: { avatarFileId: true } } } },
};

export async function getOwnTalentProfile(studentProfileId: string) {
  const profile = await prisma.talentProfile.findUnique({ where: { studentProfileId }, include: ownProfileInclude });
  if (!profile) return null;
  return {
    ...profile,
    completeness: calculateTalentProfileCompleteness({
      hasPhoto: Boolean(profile.studentProfile.user.avatarFileId),
      professionalHeadline: profile.professionalHeadline,
      bio: profile.bio,
      skillCount: profile.skills.length,
      softwareCount: profile.projects.reduce((count, project) => count + project.software.length, 0),
      projectCount: profile.projects.length,
      hasResume: profile.documents.some((document) => document.kind === "RESUME"),
      hasPortfolio: profile.documents.some((document) => document.kind === "PORTFOLIO"),
      linkedInUrl: profile.linkedInUrl,
    }),
  };
}

export async function upsertOwnTalentProfile(studentProfileId: string, input: TalentProfileInput) {
  return prisma.talentProfile.upsert({
    where: { studentProfileId },
    create: { studentProfileId, ...input },
    update: input,
  });
}

export async function setTalentFeatured(studentProfileId: string, featured: boolean) {
  return prisma.talentProfile.update({ where: { studentProfileId }, data: { featured } });
}

export async function getPublishedTalentProfile(studentProfileId: string) {
  return prisma.talentProfile.findFirst({
    where: { studentProfileId, visibility: "PUBLISHED" },
    select: {
      studentProfileId: true,
      professionalHeadline: true,
      bio: true,
      specialization: true,
      interests: true,
      linkedInUrl: true,
      behanceUrl: true,
      portfolioWebsiteUrl: true,
      featured: true,
      projects: {
        where: { visibility: "PUBLISHED" },
        select: { title: true, slug: true, projectType: true, shortDescription: true, externalUrl: true, skills: true, software: true },
        orderBy: { sortOrder: "asc" },
      },
    },
  });
}

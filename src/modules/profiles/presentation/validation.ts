import { z } from "zod";

const ProjectEntrySchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional(),
  images: z.array(z.string().trim().min(1)).max(20).optional(),
  semester: z.string().trim().max(100).optional(),
});

const CertificationEntrySchema = z.object({
  title: z.string().trim().min(1).max(200),
  issuer: z.string().trim().max(200).optional(),
  year: z.number().int().min(1950).max(2100).optional(),
});

const InternshipEntrySchema = z.object({
  company: z.string().trim().min(1).max(200),
  role: z.string().trim().max(200).optional(),
  duration: z.string().trim().max(100).optional(),
});

export const SaveDraftRequestSchema = z
  .object({
    bio: z.string().trim().max(4000).nullable().optional(),
    skills: z.array(z.string().trim().min(1).max(100)).max(50).optional(),
    software: z.array(z.string().trim().min(1).max(100)).max(50).optional(),
    selectedProjects: z.array(ProjectEntrySchema).max(50).optional(),
    portfolioLinks: z.array(z.string().trim().url()).max(20).optional(),
    resumeFileId: z.string().uuid().nullable().optional(),
    certifications: z.array(CertificationEntrySchema).max(50).optional(),
    internships: z.array(InternshipEntrySchema).max(50).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided",
  });

export const RequestChangesRequestSchema = z.object({
  reviewComment: z.string().trim().min(1, "A review comment is required").max(2000),
});

export const UpdateProfileVisibilityRequestSchema = z
  .object({
    isPubliclyDiscoverable: z.boolean().optional(),
    showCgpa: z.boolean().optional(),
  })
  .refine((value) => value.isPubliclyDiscoverable !== undefined || value.showCgpa !== undefined, {
    message: "At least one field must be provided",
  });

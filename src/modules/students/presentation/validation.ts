import { z } from "zod";

const PrivateFieldsSchema = z.object({
  phone: z.string().trim().min(1).max(30).nullable().optional(),
  personalEmail: z.string().trim().email().nullable().optional(),
  cgpa: z.number().min(0).max(10).nullable().optional(),
  hasActiveBacklog: z.boolean().optional(),
  backlogDetails: z.string().trim().max(2000).nullable().optional(),
  internalRemarks: z.string().trim().max(4000).nullable().optional(),
});

export const CreateStudentRequestSchema = z.object({
  email: z.string().trim().email(),
  fullName: z.string().trim().min(1).max(200),
  rollNumber: z.string().trim().min(1).max(50),
  batchId: z.string().uuid(),
  private: PrivateFieldsSchema.optional(),
});

export const UpdateStudentRequestSchema = z
  .object({
    fullName: z.string().trim().min(1).max(200).optional(),
    batchId: z.string().uuid().optional(),
    private: PrivateFieldsSchema.optional(),
  })
  .refine(
    (value) => value.fullName !== undefined || value.batchId !== undefined || value.private !== undefined,
    { message: "At least one field must be provided" },
  );

const BATCH_STATUS_VALUES = ["ACTIVE", "GRADUATED", "ARCHIVED"] as const;

export const SearchStudentsQuerySchema = z.object({
  name: z.string().trim().min(1).optional(),
  rollNumber: z.string().trim().min(1).optional(),
  batchId: z.string().uuid().optional(),
  batchStatus: z.enum(BATCH_STATUS_VALUES).optional(),
  skills: z
    .string()
    .transform((value) => value.split(",").map((s) => s.trim()).filter(Boolean))
    .optional(),
  software: z
    .string()
    .transform((value) => value.split(",").map((s) => s.trim()).filter(Boolean))
    .optional(),
  cgpaMin: z.coerce.number().min(0).max(10).optional(),
  cgpaMax: z.coerce.number().min(0).max(10).optional(),
  includeInactive: z.coerce.boolean().optional(),
});

// NFR-SEC-06 / docs/security/14_Security_Architecture.md: uploads are
// restricted by a MIME allow-list, not a deny-list. This module only ever
// registers a *reference* to a file uploaded by some other, not-yet-built
// storage mechanism (see AttachConfidentialDocumentUseCase) — it never
// receives the file body, so it cannot validate actual file content/
// signature bytes the way a real upload endpoint must. This allow-list is
// the partial check available at this layer (rejects an obviously wrong or
// unexpected declared type); full content-sniffing validation is a
// prerequisite of building the actual upload endpoint, not something this
// metadata-only registration can perform.
const ALLOWED_CONFIDENTIAL_DOCUMENT_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
] as const;

export const AttachConfidentialDocumentRequestSchema = z.object({
  storageKey: z.string().trim().min(1).max(1024),
  mimeType: z.enum(ALLOWED_CONFIDENTIAL_DOCUMENT_MIME_TYPES),
  sizeBytes: z.number().int().positive().max(50 * 1024 * 1024), // 50MB ceiling, per NFR-SEC-06
});

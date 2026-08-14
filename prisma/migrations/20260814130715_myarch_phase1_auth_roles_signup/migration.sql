-- MYARCH Phase 1 (§2.3/§2.4) — Role.ALUMNI, Coordinator granular
-- permissions, self-signup + email verification + password reset
-- infrastructure for Student/Recruiter/Alumni.
--
-- Generated via `prisma migrate diff` against the pre-Phase-1 schema, with
-- the diff's spurious `DROP INDEX .._searchVector_idx` / `ALTER COLUMN
-- "searchVector" DROP DEFAULT` statements manually removed — those are a
-- known Prisma limitation diffing `Unsupported("tsvector")` GENERATED
-- ALWAYS ... STORED columns (20260809060229_add_search_vectors), not a
-- real intended change; applying them would drop the full-text search GIN
-- indexes and corrupt those generated columns.

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'ALUMNI';

-- AlterTable
ALTER TABLE "alumni_profiles" ADD COLUMN     "approvalStatus" "RecruiterApprovalStatus" NOT NULL DEFAULT 'APPROVED',
ADD COLUMN     "userId" UUID;

-- AlterTable
ALTER TABLE "coordinator_profiles" ADD COLUMN     "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "registration_requests" ADD COLUMN     "emailVerifiedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "emailVerifiedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "email_verification_tokens" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" UUID,
    "registrationRequestId" UUID,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_verification_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "email_verification_tokens_tokenHash_key" ON "email_verification_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "email_verification_tokens_email_idx" ON "email_verification_tokens"("email");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_tokenHash_key" ON "password_reset_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "password_reset_tokens_userId_idx" ON "password_reset_tokens"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "alumni_profiles_userId_key" ON "alumni_profiles"("userId");

-- AddForeignKey
ALTER TABLE "email_verification_tokens" ADD CONSTRAINT "email_verification_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_verification_tokens" ADD CONSTRAINT "email_verification_tokens_registrationRequestId_fkey" FOREIGN KEY ("registrationRequestId") REFERENCES "registration_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alumni_profiles" ADD CONSTRAINT "alumni_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

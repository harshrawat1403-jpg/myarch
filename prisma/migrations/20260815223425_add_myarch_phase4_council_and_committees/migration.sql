-- CreateEnum
CREATE TYPE "CommitteeType" AS ENUM ('STUDENT_COUNCIL', 'CORE_COMMITTEE', 'EVENT_COMMITTEE', 'TECHNICAL_COMMITTEE', 'PROJECT_TEAM', 'TEMPORARY_COMMITTEE');

-- CreateEnum
CREATE TYPE "CommitteeStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- AlterTable
ALTER TABLE "meetings" ADD COLUMN     "committeeId" UUID;

-- CreateTable
CREATE TABLE "committees" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" "CommitteeType" NOT NULL,
    "status" "CommitteeStatus" NOT NULL DEFAULT 'ACTIVE',
    "academicYear" TEXT,
    "responsibilities" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "committees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "committee_memberships" (
    "id" UUID NOT NULL,
    "committeeId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "position" TEXT,
    "isLead" BOOLEAN NOT NULL DEFAULT false,
    "academicYear" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "committee_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "committee_attachments" (
    "id" UUID NOT NULL,
    "committeeId" UUID NOT NULL,
    "fileId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "committee_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "committees_type_idx" ON "committees"("type");

-- CreateIndex
CREATE INDEX "committees_status_idx" ON "committees"("status");

-- CreateIndex
CREATE INDEX "committee_memberships_committeeId_idx" ON "committee_memberships"("committeeId");

-- CreateIndex
CREATE INDEX "committee_memberships_userId_idx" ON "committee_memberships"("userId");

-- CreateIndex
CREATE INDEX "committee_attachments_committeeId_idx" ON "committee_attachments"("committeeId");

-- CreateIndex
CREATE INDEX "meetings_committeeId_idx" ON "meetings"("committeeId");

-- AddForeignKey
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_committeeId_fkey" FOREIGN KEY ("committeeId") REFERENCES "committees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "committee_memberships" ADD CONSTRAINT "committee_memberships_committeeId_fkey" FOREIGN KEY ("committeeId") REFERENCES "committees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "committee_memberships" ADD CONSTRAINT "committee_memberships_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "committee_attachments" ADD CONSTRAINT "committee_attachments_committeeId_fkey" FOREIGN KEY ("committeeId") REFERENCES "committees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "committee_attachments" ADD CONSTRAINT "committee_attachments_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "file_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateEnum
CREATE TYPE "RecruiterInterestStatus" AS ENUM ('SENT', 'ACCEPTED', 'DECLINED', 'COMPLETED');

-- CreateTable
CREATE TABLE "recruiter_student_interactions" (
    "id" UUID NOT NULL,
    "recruiterProfileId" UUID NOT NULL,
    "studentProfileId" UUID NOT NULL,
    "savedAt" TIMESTAMP(3),
    "isShortlisted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recruiter_student_interactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recruiter_interest_requests" (
    "id" UUID NOT NULL,
    "recruiterProfileId" UUID NOT NULL,
    "studentProfileId" UUID NOT NULL,
    "message" TEXT,
    "status" "RecruiterInterestStatus" NOT NULL DEFAULT 'SENT',
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "recruiter_interest_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "recruiter_student_interactions_studentProfileId_idx" ON "recruiter_student_interactions"("studentProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "recruiter_student_interactions_recruiterProfileId_studentPr_key" ON "recruiter_student_interactions"("recruiterProfileId", "studentProfileId");

-- CreateIndex
CREATE INDEX "recruiter_interest_requests_studentProfileId_idx" ON "recruiter_interest_requests"("studentProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "recruiter_interest_requests_recruiterProfileId_studentProfi_key" ON "recruiter_interest_requests"("recruiterProfileId", "studentProfileId");

-- AddForeignKey
ALTER TABLE "recruiter_student_interactions" ADD CONSTRAINT "recruiter_student_interactions_recruiterProfileId_fkey" FOREIGN KEY ("recruiterProfileId") REFERENCES "recruiter_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recruiter_student_interactions" ADD CONSTRAINT "recruiter_student_interactions_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "student_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recruiter_interest_requests" ADD CONSTRAINT "recruiter_interest_requests_recruiterProfileId_fkey" FOREIGN KEY ("recruiterProfileId") REFERENCES "recruiter_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recruiter_interest_requests" ADD CONSTRAINT "recruiter_interest_requests_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "student_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

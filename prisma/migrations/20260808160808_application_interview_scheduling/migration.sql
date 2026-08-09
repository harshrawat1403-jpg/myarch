-- CreateEnum
CREATE TYPE "InterviewMode" AS ENUM ('ONLINE', 'IN_PERSON', 'PHONE');

-- AlterTable
ALTER TABLE "applications" ADD COLUMN     "interviewMode" "InterviewMode",
ADD COLUMN     "interviewScheduledAt" TIMESTAMP(3);

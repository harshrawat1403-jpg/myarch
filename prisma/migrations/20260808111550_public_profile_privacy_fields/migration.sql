-- AlterTable
ALTER TABLE "student_public_profiles" ADD COLUMN     "isPubliclyDiscoverable" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "showCgpa" BOOLEAN NOT NULL DEFAULT false;

-- DropForeignKey
ALTER TABLE "maintenance_issues" DROP CONSTRAINT "maintenance_issues_requesterId_fkey";

-- AlterTable
ALTER TABLE "maintenance_issues" ADD COLUMN     "publicReporterEmail" TEXT,
ADD COLUMN     "publicReporterName" TEXT,
ALTER COLUMN "requesterId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "maintenance_issues" ADD CONSTRAINT "maintenance_issues_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

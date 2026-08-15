-- AlterEnum
ALTER TYPE "CoordinatorPosition" ADD VALUE 'TECHNICAL';
ALTER TYPE "CoordinatorPosition" ADD VALUE 'OTHER';

-- AlterTable
ALTER TABLE "coordinator_profiles" ADD COLUMN     "customPosition" TEXT;

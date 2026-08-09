-- CreateEnum
CREATE TYPE "CoordinatorPosition" AS ENUM ('T_AND_P', 'ALUMNI');

-- AlterTable
ALTER TABLE "coordinator_profiles" ADD COLUMN     "position" "CoordinatorPosition";

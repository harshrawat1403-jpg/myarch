-- CreateEnum
CREATE TYPE "MaintenanceCoordinatorRole" AS ENUM ('MAINTENANCE_SECRETARY', 'MAINTENANCE_COORDINATOR');

-- AlterTable
ALTER TABLE "coordinator_profiles" ADD COLUMN     "maintenanceRole" "MaintenanceCoordinatorRole";

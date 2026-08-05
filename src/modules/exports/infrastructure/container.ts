import { prisma } from "@/lib/prisma";
import { GenerateStudentDirectoryExportUseCase } from "../application/use-cases/generate-student-directory-export";
import { GenerateBatchReportExportUseCase } from "../application/use-cases/generate-batch-report-export";
import { GeneratePublicPlacementExportUseCase } from "../application/use-cases/generate-public-placement-export";
import { GenerateRecruiterDirectoryExportUseCase } from "../application/use-cases/generate-recruiter-directory-export";
import { PrismaStudentDirectoryExportRepository } from "./prisma-student-directory-export-repository";
import { PrismaBatchReportExportRepository } from "./prisma-batch-report-export-repository";
import { PrismaPublicPlacementExportRepository } from "./prisma-public-placement-export-repository";
import { PrismaRecruiterDirectoryExportRepository } from "./prisma-recruiter-directory-export-repository";

// No secrets/config required for this module — safe to construct eagerly.
export const generateStudentDirectoryExportUseCase = new GenerateStudentDirectoryExportUseCase({
  repository: new PrismaStudentDirectoryExportRepository(prisma),
});
export const generateBatchReportExportUseCase = new GenerateBatchReportExportUseCase({
  repository: new PrismaBatchReportExportRepository(prisma),
});
export const generatePublicPlacementExportUseCase = new GeneratePublicPlacementExportUseCase({
  repository: new PrismaPublicPlacementExportRepository(prisma),
});
export const generateRecruiterDirectoryExportUseCase = new GenerateRecruiterDirectoryExportUseCase({
  repository: new PrismaRecruiterDirectoryExportRepository(prisma),
});

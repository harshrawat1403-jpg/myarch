import { prisma } from "@/lib/prisma";
import { PrismaAuditRecorder } from "@/lib/audit";
import { PrismaPlacementReportRepository } from "./prisma-placement-report-repository";
import { PrismaRecruitingActivityRepository } from "./prisma-recruiting-activity-repository";
import { PrismaAlumniReportRepository } from "./prisma-alumni-report-repository";
import { PrismaPublicationsReportRepository } from "./prisma-publications-report-repository";

import { GetPlacementFunnelReportUseCase } from "../application/use-cases/get-placement-funnel-report";
import { GetMyPlacementActivityUseCase } from "../application/use-cases/get-my-placement-activity";
import { GetMyRecruitingActivityUseCase } from "../application/use-cases/get-my-recruiting-activity";
import { GetAlumniReportUseCase } from "../application/use-cases/get-alumni-report";
import { GetPublicationsUsageReportUseCase } from "../application/use-cases/get-publications-usage-report";

const placementReportRepository = new PrismaPlacementReportRepository(prisma);
const recruitingActivityRepository = new PrismaRecruitingActivityRepository(prisma);
const alumniReportRepository = new PrismaAlumniReportRepository(prisma);
const publicationsReportRepository = new PrismaPublicationsReportRepository(prisma);
const auditRecorder = new PrismaAuditRecorder(prisma);

export const getPlacementFunnelReportUseCase = new GetPlacementFunnelReportUseCase({ repository: placementReportRepository, auditRecorder });
export const getMyPlacementActivityUseCase = new GetMyPlacementActivityUseCase({ repository: placementReportRepository });
export const getMyRecruitingActivityUseCase = new GetMyRecruitingActivityUseCase({ repository: recruitingActivityRepository });
export const getAlumniReportUseCase = new GetAlumniReportUseCase({ repository: alumniReportRepository, auditRecorder });
export const getPublicationsUsageReportUseCase = new GetPublicationsUsageReportUseCase({ repository: publicationsReportRepository, auditRecorder });

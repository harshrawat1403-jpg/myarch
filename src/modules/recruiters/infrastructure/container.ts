import { prisma } from "@/lib/prisma";
import { SearchDirectoryUseCase } from "../application/use-cases/search-directory";
import { GetRecruiterStudentProfileUseCase } from "../application/use-cases/get-student-profile";
import { GetDashboardStatsUseCase } from "../application/use-cases/get-dashboard-stats";
import { GetResumeReferenceUseCase } from "../application/use-cases/get-resume-reference";
import { PrismaRecruiterDirectoryRepository } from "./prisma-recruiter-directory-repository";

// No secrets/config required for this module — safe to construct eagerly.
const directoryRepository = new PrismaRecruiterDirectoryRepository(prisma);

export const searchDirectoryUseCase = new SearchDirectoryUseCase({ directoryRepository });
export const getRecruiterStudentProfileUseCase = new GetRecruiterStudentProfileUseCase({
  directoryRepository,
});
export const getDashboardStatsUseCase = new GetDashboardStatsUseCase({ directoryRepository });
export const getResumeReferenceUseCase = new GetResumeReferenceUseCase({ directoryRepository });

import { prisma } from "@/lib/prisma";
import { PrismaAuditRecorder } from "@/lib/audit";
import { PrismaAlumniRepository } from "./prisma-alumni-repository";
import { CreateAlumniUseCase } from "../application/use-cases/create-alumni";
import { UpdateAlumniUseCase } from "../application/use-cases/update-alumni";
import { DeleteAlumniUseCase } from "../application/use-cases/delete-alumni";
import { SearchAlumniUseCase } from "../application/use-cases/search-alumni";
import { GetAlumniUseCase } from "../application/use-cases/get-alumni";

// No secrets required — safe to construct eagerly.
const alumniRepository = new PrismaAlumniRepository(prisma);
const auditRecorder = new PrismaAuditRecorder(prisma);

export const createAlumniUseCase = new CreateAlumniUseCase({ alumniRepository, auditRecorder });
export const updateAlumniUseCase = new UpdateAlumniUseCase({ alumniRepository, auditRecorder });
export const deleteAlumniUseCase = new DeleteAlumniUseCase({ alumniRepository, auditRecorder });
export const searchAlumniUseCase = new SearchAlumniUseCase({ alumniRepository });
export const getAlumniUseCase = new GetAlumniUseCase({ alumniRepository });

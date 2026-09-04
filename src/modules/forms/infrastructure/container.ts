import { prisma } from "@/lib/prisma";
import { PrismaAuditRecorder } from "@/lib/audit";
import { PrismaCommitteeLookup } from "./prisma-committee-lookup";
import { PrismaFormRepository } from "./prisma-form-repository";
import { CreateFormUseCase } from "../application/use-cases/create-form";
import { UpdateFormUseCase } from "../application/use-cases/update-form";
import { GetFormUseCase } from "../application/use-cases/get-form";
import { SearchFormsUseCase } from "../application/use-cases/search-forms";
import { SetFormStatusUseCase } from "../application/use-cases/set-form-status";

export const formRepository = new PrismaFormRepository(prisma);
const committeeLookup = new PrismaCommitteeLookup(prisma);
const auditRecorder = new PrismaAuditRecorder(prisma);

export const createFormUseCase = new CreateFormUseCase({ formRepository, committeeLookup, auditRecorder });
export const updateFormUseCase = new UpdateFormUseCase({ formRepository, committeeLookup, auditRecorder });
export const getFormUseCase = new GetFormUseCase({ formRepository });
export const searchFormsUseCase = new SearchFormsUseCase({ formRepository });
export const setFormStatusUseCase = new SetFormStatusUseCase({ formRepository, auditRecorder });


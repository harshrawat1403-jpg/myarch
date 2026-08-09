import { prisma } from "@/lib/prisma";
import { GlobalSearchUseCase } from "../application/use-cases/global-search";
import { PrismaGlobalSearchRepository } from "./prisma-global-search-repository";

const globalSearchRepository = new PrismaGlobalSearchRepository(prisma);

export const globalSearchUseCase = new GlobalSearchUseCase({ repository: globalSearchRepository });

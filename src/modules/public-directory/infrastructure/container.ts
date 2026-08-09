import { prisma } from "@/lib/prisma";
import { SearchPublicDirectoryUseCase } from "../application/use-cases/search-public-directory";
import { GetPublicProfileUseCase } from "../application/use-cases/get-public-profile";
import { PrismaPublicDirectoryRepository } from "./prisma-public-directory-repository";

// No secrets required — safe to construct eagerly.
const publicDirectoryRepository = new PrismaPublicDirectoryRepository(prisma);

export const searchPublicDirectoryUseCase = new SearchPublicDirectoryUseCase({ publicDirectoryRepository });
export const getPublicProfileUseCase = new GetPublicProfileUseCase({ publicDirectoryRepository });

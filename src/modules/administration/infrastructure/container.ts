import { prisma } from "@/lib/prisma";
import { SearchUserDirectoryUseCase } from "../application/use-cases/search-user-directory";
import { PrismaDirectoryRepository } from "./prisma-directory-repository";

// No secrets required — safe to construct eagerly.
const directoryRepository = new PrismaDirectoryRepository(prisma);

export const searchUserDirectoryUseCase = new SearchUserDirectoryUseCase({ directoryRepository });

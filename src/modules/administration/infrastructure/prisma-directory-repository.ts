import type { PrismaClient } from "@prisma/client";
import type { DirectoryEntry, DirectoryRole, DirectorySearchFilters } from "../domain/entities";
import type { DirectoryRepository } from "../application/ports/directory-repository";

/**
 * Application-code merge of four independent, role-scoped queries — never a
 * raw SQL UNION (each role table has a different shape, and Prisma's typed
 * query builder keeps every query reviewable against its own schema). When
 * `scope.batchIds` is provided (a Coordinator), only the Student query
 * runs — Coordinator/Recruiter/Secretary rows are never fetched at all, not
 * merely filtered out after the fact.
 */
export class PrismaDirectoryRepository implements DirectoryRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async search(
    filters: DirectorySearchFilters,
    scope: { batchIds?: readonly string[] },
  ): Promise<DirectoryEntry[]> {
    const isCoordinatorScoped = scope.batchIds !== undefined;
    const wantsRole = (role: DirectoryRole) => !filters.role || filters.role === role;
    const query = filters.query;

    const entries: DirectoryEntry[] = [];

    if (!isCoordinatorScoped) {
      if (wantsRole("SECRETARY")) {
        const rows = await this.prisma.secretaryProfile.findMany({
          where: {
            OR: query
              ? [{ fullName: { contains: query, mode: "insensitive" } }, { user: { email: { contains: query, mode: "insensitive" } } }]
              : undefined,
            user: { isActive: filters.includeInactive ? undefined : true },
          },
          include: { user: true },
        });
        for (const row of rows) {
          entries.push({
            userId: row.userId,
            profileId: row.id,
            role: "SECRETARY",
            fullName: row.fullName,
            email: row.user.email,
            isActive: row.user.isActive,
            lastLoginAt: row.user.lastLoginAt,
            createdAt: row.user.createdAt,
          });
        }
      }

      if (wantsRole("COORDINATOR")) {
        const rows = await this.prisma.coordinatorProfile.findMany({
          where: {
            OR: query
              ? [{ fullName: { contains: query, mode: "insensitive" } }, { user: { email: { contains: query, mode: "insensitive" } } }]
              : undefined,
            isActive: filters.includeInactive ? undefined : true,
          },
          include: { user: true },
        });
        for (const row of rows) {
          entries.push({
            userId: row.userId,
            profileId: row.id,
            role: "COORDINATOR",
            fullName: row.fullName,
            email: row.user.email,
            isActive: row.isActive,
            lastLoginAt: row.user.lastLoginAt,
            createdAt: row.user.createdAt,
          });
        }
      }

      if (wantsRole("RECRUITER")) {
        const rows = await this.prisma.recruiterProfile.findMany({
          where: {
            OR: query
              ? [
                  { fullName: { contains: query, mode: "insensitive" } },
                  { companyName: { contains: query, mode: "insensitive" } },
                  { user: { email: { contains: query, mode: "insensitive" } } },
                ]
              : undefined,
            isActive: filters.includeInactive ? undefined : true,
          },
          include: { user: true },
        });
        for (const row of rows) {
          entries.push({
            userId: row.userId,
            profileId: row.id,
            role: "RECRUITER",
            fullName: row.fullName,
            email: row.user.email,
            isActive: row.isActive,
            lastLoginAt: row.user.lastLoginAt,
            createdAt: row.user.createdAt,
            companyName: row.companyName,
          });
        }
      }
    }

    if (wantsRole("STUDENT")) {
      const rows = await this.prisma.studentProfile.findMany({
        where: {
          OR: query
            ? [
                { fullName: { contains: query, mode: "insensitive" } },
                { rollNumber: { contains: query, mode: "insensitive" } },
                { user: { email: { contains: query, mode: "insensitive" } } },
              ]
            : undefined,
          isActive: filters.includeInactive ? undefined : true,
          batchId: isCoordinatorScoped ? { in: [...(scope.batchIds ?? [])] } : undefined,
        },
        include: { user: true, batch: true },
      });
      for (const row of rows) {
        entries.push({
          userId: row.userId,
          profileId: row.id,
          role: "STUDENT",
          fullName: row.fullName,
          email: row.user.email,
          isActive: row.isActive,
          lastLoginAt: row.user.lastLoginAt,
          createdAt: row.user.createdAt,
          batchId: row.batchId,
          batchName: row.batch.name,
        });
      }
    }

    return entries.sort((a, b) => a.fullName.localeCompare(b.fullName));
  }
}

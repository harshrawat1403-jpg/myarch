import { PrismaClient, type Prisma } from "@prisma/client";

/**
 * Singleton PrismaClient, cached on the global object in development so
 * Next.js's hot-reload doesn't open a new database connection pool on every
 * edit (a well-known Prisma + Next.js dev-mode pitfall).
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

/**
 * Repository/service constructors across the codebase are typed to accept
 * either the top-level `prisma` singleton or the `tx` handed to a
 * `prisma.$transaction(async (tx) => ...)` callback — the same class works
 * either way, since both expose the identical model-delegate API. This is
 * what lets a caller that needs several repositories' writes to commit or
 * roll back together (e.g. registration approval — see
 * modules/registration/infrastructure/container.ts) build transaction-
 * scoped instances of existing repository classes instead of duplicating
 * their logic.
 */
export type PrismaTransactionClient = PrismaClient | Prisma.TransactionClient;

import { PrismaClient } from "@prisma/client";

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

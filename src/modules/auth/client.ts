/**
 * Client-safe entry point for the auth module — deliberately separate from
 * `./index.ts`, which re-exports server-only code (route handlers backed by
 * Prisma/bcrypt/jsonwebtoken via the composition root). A "use client"
 * component importing from the SAME barrel as that server code would force
 * Next.js to try bundling Prisma for the browser. Client Components and
 * client-rendered pages should import session/auth state from here;
 * anything server-side (route handlers, `withAuth`, domain types/errors,
 * permission functions) still comes from `@/modules/auth`.
 */
export { AuthProvider, useAuth } from "./presentation/client/auth-provider";
export type { AuthContextValue } from "./presentation/client/auth-provider";

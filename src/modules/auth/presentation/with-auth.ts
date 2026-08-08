import type { NextRequest } from "next/server";
import type { AuthenticatedActor, Role } from "../domain/entities";
import type { TokenService } from "../application/ports/token-service";
import { forbidden, passwordChangeRequired, unauthorized } from "@/lib/http-errors";

/**
 * The required request flow for every protected route
 * (docs/api/10_API_Architecture.md, docs/security/14_Security_Architecture.md):
 *
 *   Request → Authentication → JWT Validation → Role Validation
 *           → Batch Scope Validation (when applicable) → Business Logic
 *
 * This middleware performs exactly the first four steps and nothing else —
 * business logic always lives in the wrapped handler, which calls into an
 * Application-layer use case. See docs/planning/19_Decision_Log.md and the
 * Days 2–3 implementation summary for why this is a plain higher-order
 * function rather than Next.js `middleware.ts`: Next's edge middleware
 * cannot easily share the same TokenService/Prisma-backed dependencies used
 * elsewhere in the app, and per-route wrapping keeps the auth requirement
 * visible at the call site of every route handler, rather than implied by a
 * separate matcher config file.
 */

export interface AuthOptions {
  /** If omitted, any authenticated role is allowed. */
  roles?: readonly Role[];
  /**
   * Resolves the batch ID the requested resource belongs to, if any. When
   * present and the caller is a Coordinator, their batch scope must include
   * it — enforced centrally here so no route handler re-implements this
   * check (docs/security/09_User_Roles_and_Permissions.md).
   */
  getRequiredBatchId?: (
    req: NextRequest,
    routeContext: unknown,
  ) => string | undefined | Promise<string | undefined>;
  /**
   * V3.0 Administration Platform. A session with `mustChangePassword: true`
   * (temp password from account creation or an admin reset) is rejected
   * with MUST_CHANGE_PASSWORD on every route except the handful that opt in
   * by setting this true — the change-password endpoint itself, logout, and
   * /me (so the frontend can read the flag back). Claims-only check, no DB
   * round trip, the same category of check as the role/batch-scope steps
   * below it.
   */
  allowMustChangePassword?: boolean;
}

export type AuthenticatedHandler = (
  req: NextRequest,
  auth: { actor: AuthenticatedActor },
  routeContext: unknown,
) => Promise<Response> | Response;

function extractBearerToken(req: NextRequest): string | null {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice("Bearer ".length).trim();
  return token.length > 0 ? token : null;
}

/**
 * Factory rather than a bare singleton so tests can bind their own
 * TokenService (with test secrets) without touching process.env or the
 * production composition root (`../infrastructure/container`).
 *
 * Takes only the one method it actually calls (Interface Segregation) —
 * this also lets the composition root pass a lazily-resolving accessor
 * instead of a fully-constructed TokenService, so wrapping a handler with
 * `withAuth(...)` at module load time never forces environment/secret
 * validation to happen before the first real request.
 */
export function createAuthMiddleware(tokenService: Pick<TokenService, "verifyAccessToken">) {
  return function withAuth(handler: AuthenticatedHandler, options: AuthOptions = {}) {
    return async (req: NextRequest, routeContext?: unknown): Promise<Response> => {
      // 1 & 2. Authentication + JWT Validation.
      const token = extractBearerToken(req);
      if (!token) {
        return unauthorized("Missing access token");
      }

      let claims;
      try {
        claims = tokenService.verifyAccessToken(token);
      } catch {
        return unauthorized("Invalid or expired access token");
      }

      const actor: AuthenticatedActor = {
        userId: claims.sub,
        role: claims.role,
        batchScope: claims.batchScope,
        studentProfileId: claims.studentProfileId,
        mustChangePassword: claims.mustChangePassword,
      };

      // 2.5. Forced password-change gate — before role/scope checks, since a
      // temp-password session should be blocked from every business route
      // regardless of what role it holds.
      if (actor.mustChangePassword && !options.allowMustChangePassword) {
        return passwordChangeRequired("You must change your password before continuing");
      }

      // 3. Role Validation.
      if (options.roles && !options.roles.includes(actor.role)) {
        return forbidden("Your role does not permit this action");
      }

      // 4. Batch Scope Validation (Coordinators only — Secretary is
      // unscoped by design, and Students/Recruiters never carry batchScope).
      if (options.getRequiredBatchId) {
        const requiredBatchId = await options.getRequiredBatchId(req, routeContext);
        if (requiredBatchId && actor.role === "COORDINATOR") {
          const inScope = (actor.batchScope ?? []).includes(requiredBatchId);
          if (!inScope) {
            return forbidden("This batch is outside your assigned scope");
          }
        }
      }

      // 5. Business Logic — delegated entirely to the wrapped handler.
      return handler(req, { actor }, routeContext);
    };
  };
}

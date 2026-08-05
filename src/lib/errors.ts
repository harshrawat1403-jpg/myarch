/**
 * Generic, cross-cutting error thrown when a use case's defense-in-depth
 * permission check (re-applying the same centralized functions from
 * `@/modules/auth` that route-level middleware already ran) fails. Not
 * module-specific business vocabulary — any module's Application layer can
 * throw this; the Presentation layer maps it to 403.
 */
export class NotAuthorizedError extends Error {
  constructor(message = "Not authorized to perform this action") {
    super(message);
    this.name = "NotAuthorizedError";
  }
}

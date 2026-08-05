/**
 * Re-exported from the shared cross-cutting location — see
 * src/lib/audit.ts for the full rationale (a second module needing the
 * exact same port during Days 5–6 is why this moved out of being
 * auth-module-local). Kept as a re-export, not deleted, so every existing
 * import of `../ports/audit-recorder` within this module continues to work
 * unchanged.
 */
export type { AuditRecorder } from "@/lib/audit";

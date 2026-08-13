/**
 * The three public-showcase personas (see
 * src/modules/auth/domain/demo-accounts.ts for the server-side account
 * mapping). Kept as a small, standalone client-safe type — not imported
 * from the auth module's domain layer — so any client component can use it
 * without reaching across the module boundary
 * (docs/architecture/07_Repository_Structure.md).
 */
export type DemoPersona = "STUDENT" | "RECRUITER" | "ADMIN";

export const DEMO_PERSONA_LABELS: Record<DemoPersona, string> = {
  STUDENT: "Student",
  RECRUITER: "Recruiter",
  ADMIN: "Demo Admin",
};

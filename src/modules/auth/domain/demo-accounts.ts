import type { Role } from "./entities";

/**
 * Public showcase entry points (MYARCH demo mode). Exactly three fixed
 * personas, each mapped to one of prisma/seed.ts's own dev accounts —
 * deliberately not a fourth kind of user or a new table. `ADMIN` maps to
 * the seeded Coordinator (never Secretary): Secretary is unscoped by design
 * (see domain/permissions.ts), so a batch-scoped Coordinator is the only
 * role that structurally confines the public "Demo Admin" experience to
 * the seed data's own batch, rather than being able to see whatever else a
 * given deployment's database might contain.
 */
export type DemoPersona = "STUDENT" | "RECRUITER" | "ADMIN";

export const DEMO_ACCOUNT_EMAILS: Record<DemoPersona, string> = {
  // The primary Student Demo account — see prisma/seed.ts's SHOWCASE_STUDENTS.
  STUDENT: "gautam@vnit.ac.in",
  RECRUITER: "recruiter@example.com",
  ADMIN: "coordinator@tnparch.in",
};

const RESERVED_EMAILS = new Set(Object.values(DEMO_ACCOUNT_EMAILS));

/**
 * True for exactly the three addresses above. LoginUseCase refuses ordinary
 * password login for these — the seed password is documented in
 * prisma/seed.ts, so without this check anyone who has read that (public)
 * file could sign in as one of these accounts through the normal /login
 * form and get a full, non-demo, write-enabled session, defeating the
 * read-only guarantee `with-auth.ts` gives every session issued through
 * `/api/auth/demo-login`. RefreshAccessTokenUseCase uses the same check to
 * keep a demo session read-only across token rotation.
 */
export function isReservedDemoAccountEmail(email: string): boolean {
  return RESERVED_EMAILS.has(email);
}

export function roleForDemoPersona(persona: DemoPersona): Role {
  if (persona === "STUDENT") return "STUDENT";
  if (persona === "RECRUITER") return "RECRUITER";
  return "COORDINATOR";
}

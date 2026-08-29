/**
 * Edit Mode — MYARCH UI/UX unification pass. The display label for each
 * Role never varies by route group (every layout independently retyped the
 * same "Technical Secretary"/"Coordinator"/"Student"/"Recruiter"/"Alumni"
 * dictionary, each only ever using the subset of keys its own allowed-roles
 * array needs) — one shared, superset map replaces all of them. Safe for
 * every layout to import regardless of which roles it actually allows: an
 * unused key is simply never looked up.
 */
export const ROLE_LABELS: Record<string, string> = {
  SECRETARY: "Technical Secretary",
  COORDINATOR: "Coordinator",
  STUDENT: "Student",
  RECRUITER: "Recruiter",
  ALUMNI: "Alumni",
};

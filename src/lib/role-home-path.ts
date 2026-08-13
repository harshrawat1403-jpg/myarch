/**
 * Where a session lands right after signing in — real login (the landing
 * page's own post-auth redirect) and every demo entry point (the landing
 * page's "Visit as ..." buttons, and useDemoSession's in-dashboard
 * switcher) all resolve the same session role through this one function,
 * rather than three copies of the same switch statement.
 */
export function roleHomePath(role: string | null): string {
  switch (role) {
    case "SECRETARY":
    case "COORDINATOR":
      return "/dashboard";
    case "STUDENT":
      return "/student";
    case "RECRUITER":
      return "/recruiter";
    default:
      return "/login";
  }
}

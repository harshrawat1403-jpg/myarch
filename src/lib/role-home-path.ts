/**
 * Where an already-authenticated session lands when it reaches the public
 * landing page — used by `/`'s own post-auth redirect so an authenticated
 * visitor is bounced straight to their portal home instead of seeing
 * marketing content meant for signed-out visitors.
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

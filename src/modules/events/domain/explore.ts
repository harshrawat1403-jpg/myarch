export type PublicEventStatus = "UPCOMING" | "ONGOING" | "COMPLETED";

export const EXPLORE_CATEGORIES = ["Technical", "Cultural", "Placement", "Workshop", "Seminar", "Department", "Competition", "Other"] as const;

export function slugifyEventTitle(title: string): string {
  const slug = title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 180);
  return slug || "event";
}

export function isValidEventSlug(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && slug.length <= 200;
}

export function derivePublicEventStatus(startAt: Date, endAt: Date | null, now = new Date()): PublicEventStatus {
  if (startAt > now) return "UPCOMING";
  if (endAt ? endAt >= now : startAt >= now) return "ONGOING";
  return "COMPLETED";
}

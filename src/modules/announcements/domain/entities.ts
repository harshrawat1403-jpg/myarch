/**
 * Framework-free Domain layer types for Announcements (MYARCH Phase 3,
 * §4.5). No status/lifecycle enum — `publishAt`/`expiresAt` alone decide
 * whether an announcement is currently active (see isAnnouncementActive
 * below), mirroring the schema's own choice not to add a redundant status
 * column.
 */

export type AnnouncementAudienceType = "EVERYONE" | "YEAR" | "PROGRAM" | "COMMITTEE" | "COUNCIL" | "COORDINATORS" | "SELECTED_GROUP";

/** Reuses Task Engine's own LOW/MEDIUM/HIGH/URGENT scale — redeclared per this module's own isolation convention (mirrors maintenance/events). */
export type AnnouncementPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export interface AnnouncementRecord {
  readonly id: string;
  readonly title: string;
  readonly content: string;
  readonly priority: AnnouncementPriority;
  readonly audienceType: AnnouncementAudienceType;
  readonly audienceValue: string | null;
  readonly publishAt: Date;
  readonly expiresAt: Date | null;

  readonly authorId: string;

  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface AnnouncementAttachmentRecord {
  readonly id: string;
  readonly announcementId: string;
  readonly fileId: string;
  readonly mimeType: string;
  readonly sizeBytes: number;
  readonly createdAt: Date;
}

export interface AnnouncementFilters {
  readonly audienceType?: AnnouncementAudienceType;
  readonly authorId?: string;
  readonly search?: string;
  /** publishAt <= now AND (expiresAt is null OR expiresAt > now). */
  readonly activeOnly?: boolean;
  /** Used by the Calendar module (§4.1) to query "announcements publishing within this window" — an announcement's calendar occurrence is its publishAt. */
  readonly publishAtFrom?: Date;
  readonly publishAtTo?: Date;
  /**
   * Resolved by SearchAnnouncementsUseCase for anyone without
   * announcements.manage — narrows results to announcements this specific
   * actor is actually addressed by (see isActorInAudience's identical
   * truth table, translated to SQL by the repository).
   */
  readonly audienceScopeFor?: {
    readonly userId: string;
    readonly role: string;
    readonly batchId: string | null;
    /** MYARCH Phase 4 (§5) — active Committee memberships, for COMMITTEE/COUNCIL audience matching. */
    readonly committeeIds: readonly string[];
    readonly isCouncilMember: boolean;
  };
}

export type AnnouncementSortField = "publishAt" | "createdAt";

export interface AnnouncementSort {
  readonly field: AnnouncementSortField;
  readonly direction: "asc" | "desc";
}

export interface PaginationInput {
  readonly page: number;
  readonly pageSize: number;
}

export interface PaginatedResult<T> {
  readonly items: readonly T[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
}

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export const ANNOUNCEMENT_TITLE_MAX_LENGTH = 200;
export const ANNOUNCEMENT_CONTENT_MAX_LENGTH = 10000;

export function isAnnouncementActive(
  announcement: Pick<AnnouncementRecord, "publishAt" | "expiresAt">,
  now: Date = new Date(),
): boolean {
  if (announcement.publishAt.getTime() > now.getTime()) return false;
  if (announcement.expiresAt && announcement.expiresAt.getTime() <= now.getTime()) return false;
  return true;
}

/**
 * Pure — no DB round trip. `context` carries the facts that can only be
 * resolved with a query (a Student's own batchId; whether this actor is an
 * explicit SELECTED_GROUP recipient; MYARCH Phase 4's own committeeIds/
 * isCouncilMember for COMMITTEE/COUNCIL) — everything else is decidable from
 * the actor's role alone. PROGRAM still always resolves false: no backing
 * entity exists for it anywhere in the roadmap (unlike COMMITTEE/COUNCIL,
 * which Phase 4 now backs with the real Committee table).
 */
export function isActorInAudience(
  actor: { readonly userId: string; readonly role: string },
  announcement: Pick<AnnouncementRecord, "audienceType" | "audienceValue">,
  context: {
    readonly batchId: string | null;
    readonly isSelectedRecipient: boolean;
    readonly committeeIds: readonly string[];
    readonly isCouncilMember: boolean;
  },
): boolean {
  switch (announcement.audienceType) {
    case "EVERYONE":
      return actor.role !== "RECRUITER";
    case "COORDINATORS":
      return actor.role === "COORDINATOR" || actor.role === "SECRETARY";
    case "YEAR":
      return actor.role === "STUDENT" && context.batchId !== null && context.batchId === announcement.audienceValue;
    case "SELECTED_GROUP":
      return context.isSelectedRecipient;
    case "COMMITTEE":
      return announcement.audienceValue !== null && context.committeeIds.includes(announcement.audienceValue);
    case "COUNCIL":
      return context.isCouncilMember;
    case "PROGRAM":
      return false;
  }
}

import type { CalendarSource } from "./ports/calendar-source";

/**
 * Mirrors jobs' `JobRegistry` exactly, and is the whole reason adding a new
 * calendar-producing domain never requires a change to
 * GetCalendarEntriesUseCase: a module registers its own CalendarSource
 * under its own sourceModule name from its own composition root (see
 * infrastructure/container.ts's `registerCalendarSources`).
 *
 * As of this phase, only Task Engine (via TaskCalendarSource, registered
 * from THIS module's own container since Task Engine predates Calendar and
 * has no calendar-awareness of its own), Events, and Meetings register.
 * Deliberately NOT registered: Placements (PlacementDrive.applicationDeadline),
 * Applications (Application.interviewScheduledAt), Maintenance (issue
 * deadlines) — retrofitting already-shipped modules to become calendar
 * sources is out of scope for this phase (see MYARCH_ROADMAP.md's Phase 3
 * report, KNOWN ISSUES). Elections/workshops/competitions/reviews/
 * submissions/council activities/technical activities/project milestones
 * named in §4.1 have no backing entity anywhere in the codebase yet and are
 * deferred to whichever future phase introduces them.
 */
export class CalendarSourceRegistry {
  private readonly sources = new Map<string, CalendarSource>();

  register(source: CalendarSource): void {
    if (this.sources.has(source.sourceModule)) {
      throw new Error(`A calendar source is already registered for module "${source.sourceModule}"`);
    }
    this.sources.set(source.sourceModule, source);
  }

  all(): CalendarSource[] {
    return [...this.sources.values()];
  }
}

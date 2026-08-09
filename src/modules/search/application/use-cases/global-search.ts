import type { AuthenticatedActor } from "@/modules/auth";
import { canAccessRecruiterDirectory, canManagePublications, canViewCompanies } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import type { DriveSearchResult, GlobalSearchResults } from "../../domain/entities";
import type { GlobalSearchRepository } from "../ports/global-search-repository";

const RESULTS_PER_ENTITY = 8;
// Fetched larger than RESULTS_PER_ENTITY for drives specifically, since a
// batch-eligibility filter is applied in-application afterward (mirrors
// SearchPlacementDrivesUseCase/ListOpenDrivesForStudentUseCase's own
// "fetch broad, filter by scope" shape) — without this, a Coordinator or
// Student whose scope excludes most FTS-ranked matches could see fewer
// than RESULTS_PER_ENTITY results even when more exist.
const DRIVE_FETCH_LIMIT = 25;

const EMPTY_RESULTS: GlobalSearchResults = { students: [], companies: [], drives: [], publications: [] };

/**
 * V4.0 E6 (PRD §15) — backs `/api/search`, the CommandPalette's data
 * source. Every branch below mirrors an already-established visibility
 * rule from an existing use case (cited per branch) rather than inventing
 * a new one — this endpoint must never show a role more than its existing,
 * already-audited endpoints already show it.
 */
export class GlobalSearchUseCase {
  constructor(private readonly deps: { repository: GlobalSearchRepository }) {}

  async execute(actor: AuthenticatedActor, query: string): Promise<GlobalSearchResults> {
    const trimmed = query.trim();
    if (trimmed.length < 2) return EMPTY_RESULTS;

    switch (actor.role) {
      case "SECRETARY":
        return this.searchForStaff(actor, trimmed, undefined);
      case "COORDINATOR":
        return this.searchForStaff(actor, trimmed, actor.batchScope ?? []);
      case "RECRUITER":
        return this.searchForRecruiter(actor, trimmed);
      case "STUDENT":
        return this.searchForStudent(actor, trimmed);
      default:
        throw new NotAuthorizedError("Not authorized to search");
    }
  }

  /** Secretary: unscoped. Coordinator: batch-scoped students (mirrors SearchStudentsUseCase) and any-overlap-with-scope drives (mirrors SearchPlacementDrivesUseCase). Both get Companies (canViewCompanies) and Publications (canManagePublications) — full, unscoped, per their own existing permission functions; checked explicitly here too, defense-in-depth, matching every other use case in this codebase. */
  private async searchForStaff(
    actor: AuthenticatedActor,
    query: string,
    coordinatorBatchScope: readonly string[] | undefined,
  ): Promise<GlobalSearchResults> {
    if (!canViewCompanies(actor) || !canManagePublications(actor)) throw new NotAuthorizedError("Not authorized to search");
    const isCoordinator = coordinatorBatchScope !== undefined;
    if (isCoordinator && coordinatorBatchScope.length === 0) {
      // A Coordinator with no assigned batches has nothing scoped to search for students/drives — matches SearchStudentsUseCase's identical early-return.
      const [companies, publications] = await Promise.all([
        this.deps.repository.searchCompanies(query, RESULTS_PER_ENTITY),
        this.deps.repository.searchPublications(query, RESULTS_PER_ENTITY),
      ]);
      return { students: [], companies, drives: [], publications };
    }

    const [students, companies, driveRows, publications] = await Promise.all([
      this.deps.repository.searchStudentsForStaff(query, { batchIds: coordinatorBatchScope, limit: RESULTS_PER_ENTITY }),
      this.deps.repository.searchCompanies(query, RESULTS_PER_ENTITY),
      this.deps.repository.searchDrives(query, DRIVE_FETCH_LIMIT),
      this.deps.repository.searchPublications(query, RESULTS_PER_ENTITY),
    ]);

    const drives = coordinatorBatchScope
      ? driveRows.filter((d) => d.eligibleBatchIds.some((id) => coordinatorBatchScope.includes(id)))
      : driveRows;

    return { students, companies, drives: toDriveResults(drives), publications };
  }

  /** Recruiters see only Students, via student_public_profiles (mirrors SearchDirectoryUseCase's own repository root) — no Companies/Drives/Publications, matching the recruiter portal's existing scope (it has no drive- or publication-browsing feature at all). */
  private async searchForRecruiter(actor: AuthenticatedActor, query: string): Promise<GlobalSearchResults> {
    if (!canAccessRecruiterDirectory(actor)) throw new NotAuthorizedError("Not authorized to search");
    const students = await this.deps.repository.searchStudentsForRecruiter(query, RESULTS_PER_ENTITY);
    return { ...EMPTY_RESULTS, students };
  }

  /** Students see only open Drives (mirrors ListOpenDrivesForStudentUseCase's exact ANNOUNCED/IN_PROGRESS + batch-eligible + deadline-not-passed rule) — never other students, never Companies/Publications directly. */
  private async searchForStudent(actor: AuthenticatedActor, query: string): Promise<GlobalSearchResults> {
    if (!actor.studentProfileId) throw new NotAuthorizedError("Not authorized to search");
    const batchId = await this.deps.repository.findStudentBatchId(actor.studentProfileId);
    if (!batchId) return EMPTY_RESULTS;

    const driveRows = await this.deps.repository.searchDrives(query, DRIVE_FETCH_LIMIT);
    const now = new Date();
    const visible = driveRows.filter((d) => {
      const isOpen = d.status === "ANNOUNCED" || d.status === "IN_PROGRESS";
      const openToAllBatches = d.eligibleBatchIds.length === 0;
      const eligibleByBatch = openToAllBatches || d.eligibleBatchIds.includes(batchId);
      const deadlineNotPassed = !d.applicationDeadline || d.applicationDeadline >= now;
      return isOpen && eligibleByBatch && deadlineNotPassed;
    });

    return { ...EMPTY_RESULTS, drives: toDriveResults(visible) };
  }
}

function toDriveResults(rows: readonly { id: string; title: string; status: string; companyName: string }[]): DriveSearchResult[] {
  return rows.slice(0, RESULTS_PER_ENTITY).map((r) => ({
    kind: "DRIVE",
    id: r.id,
    title: r.title,
    status: r.status as DriveSearchResult["status"],
    companyName: r.companyName,
  }));
}

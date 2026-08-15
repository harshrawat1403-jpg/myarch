import type {
  MaintenanceCategory,
  MaintenanceIssueFilters,
  MaintenanceIssueRecord,
  MaintenanceIssueSort,
  MaintenanceIssueStatus,
  MaintenancePriority,
  PaginatedResult,
  PaginationInput,
} from "../../domain/entities";

export interface CreateMaintenanceIssueData {
  category: MaintenanceCategory;
  location: string;
  description: string;
  priority?: MaintenancePriority;
  /** Exactly one of requesterId or the publicReporter* pair is provided — enforced by the calling use case (ReportMaintenanceIssueUseCase vs. ReportPublicMaintenanceIssueUseCase), not by this port. */
  requesterId?: string;
  publicReporterName?: string;
  publicReporterEmail?: string;
}

export interface UpdateMaintenanceIssueData {
  priority?: MaintenancePriority;
  deadline?: Date | null;
  description?: string;
}

export interface DashboardStats {
  readonly open: number;
  readonly critical: number;
  readonly overdue: number;
  readonly assigned: number;
  readonly inProgress: number;
  readonly resolved: number;
  /** Milliseconds, averaged over issues with a recorded acknowledgedAt. */
  readonly averageResponseTimeMs: number | null;
  /** Milliseconds, averaged over issues with a recorded resolvedAt. */
  readonly averageResolutionTimeMs: number | null;
  readonly byCategory: Readonly<Record<string, number>>;
  readonly byLocation: Readonly<Record<string, number>>;
  /** Locations with 3+ issues reported in the lookback window — §3.9 "recurring issues". */
  readonly recurringLocations: readonly { location: string; count: number }[];
  readonly escalatedCount: number;
  /** userId -> count of currently open (not RESOLVED/VERIFIED/CLOSED) issues assigned to them. */
  readonly coordinatorWorkload: Readonly<Record<string, number>>;
}

export interface MaintenanceIssueRepository {
  create(data: CreateMaintenanceIssueData): Promise<MaintenanceIssueRecord>;
  findById(id: string): Promise<MaintenanceIssueRecord | null>;
  update(id: string, data: UpdateMaintenanceIssueData): Promise<MaintenanceIssueRecord>;
  acknowledge(id: string): Promise<MaintenanceIssueRecord>;
  assign(id: string, assigneeId: string, taskId: string, deadline: Date | null): Promise<MaintenanceIssueRecord>;
  reassign(id: string, assigneeId: string): Promise<MaintenanceIssueRecord>;
  setStatus(id: string, status: MaintenanceIssueStatus): Promise<MaintenanceIssueRecord>;
  resolve(id: string, resolutionDetails: string): Promise<MaintenanceIssueRecord>;
  reopen(id: string): Promise<MaintenanceIssueRecord>;

  search(
    filters: MaintenanceIssueFilters,
    sort: MaintenanceIssueSort,
    pagination: PaginationInput,
  ): Promise<PaginatedResult<MaintenanceIssueRecord>>;

  /** §3.9 — aggregate stats computed server-side (counts/averages), not paginated rows. */
  getDashboardStats(): Promise<DashboardStats>;
}

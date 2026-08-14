import type {
  PaginatedResult,
  PaginationInput,
  TaskFilters,
  TaskPriority,
  TaskRecord,
  TaskSort,
  TaskStatus,
} from "../../domain/entities";

export interface CreateTaskData {
  title: string;
  description?: string | null;
  priority?: TaskPriority;
  ownerId: string;
  creatorId: string;
  deadline?: Date | null;
  reminderAt?: Date | null;
  relatedEntityType?: string | null;
  relatedEntityId?: string | null;
}

export interface UpdateTaskData {
  title?: string;
  description?: string | null;
  priority?: TaskPriority;
  deadline?: Date | null;
  reminderAt?: Date | null;
}

export interface TaskRepository {
  create(data: CreateTaskData): Promise<TaskRecord>;
  findById(id: string): Promise<TaskRecord | null>;
  update(id: string, data: UpdateTaskData): Promise<TaskRecord>;

  /** DONE stamps completedAt; CANCELLED stamps cancelledAt; any other target status touches neither. Validated against the state machine (domain/task-status.ts) by the calling use case, not here. */
  setStatus(id: string, status: TaskStatus): Promise<TaskRecord>;

  /** DONE/CANCELLED → TODO, clearing completedAt/cancelledAt. */
  reopen(id: string): Promise<TaskRecord>;

  reassign(id: string, newOwnerId: string): Promise<TaskRecord>;

  /** `escalatedToId` may be null if no active Secretary exists (escalatedAt is still stamped). */
  escalate(id: string, escalatedToId: string | null): Promise<TaskRecord>;

  search(filters: TaskFilters, sort: TaskSort, pagination: PaginationInput): Promise<PaginatedResult<TaskRecord>>;
}

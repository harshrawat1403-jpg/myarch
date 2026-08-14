import type {
  PaginatedResult,
  PaginationInput,
  RequestDecision,
  RequestFilters,
  RequestPriority,
  RequestRecord,
  RequestSort,
  RequestStatus,
} from "../../domain/entities";

export interface CreateRequestData {
  type: string;
  description: string;
  priority?: RequestPriority;
  requesterId: string;
}

export interface UpdateRequestData {
  priority?: RequestPriority;
  deadline?: Date | null;
  description?: string;
}

export interface RequestRepository {
  create(data: CreateRequestData): Promise<RequestRecord>;
  findById(id: string): Promise<RequestRecord | null>;
  update(id: string, data: UpdateRequestData): Promise<RequestRecord>;
  startReview(id: string): Promise<RequestRecord>;
  decide(id: string, decision: RequestDecision, decisionReason: string | null): Promise<RequestRecord>;
  assign(id: string, ownerId: string, taskId: string, deadline: Date | null): Promise<RequestRecord>;
  reassign(id: string, ownerId: string): Promise<RequestRecord>;
  setStatus(id: string, status: RequestStatus): Promise<RequestRecord>;

  search(filters: RequestFilters, sort: RequestSort, pagination: PaginationInput): Promise<PaginatedResult<RequestRecord>>;
}

import type {
  CommitteeFilters,
  CommitteeRecord,
  CommitteeSort,
  CommitteeStatus,
  CommitteeType,
  PaginatedResult,
  PaginationInput,
} from "../../domain/entities";

export interface CreateCommitteeData {
  name: string;
  type: CommitteeType;
  academicYear?: string | null;
  responsibilities?: string | null;
  startDate?: Date | null;
  endDate?: Date | null;
}

export interface UpdateCommitteeData {
  name?: string;
  academicYear?: string | null;
  responsibilities?: string | null;
  startDate?: Date | null;
  endDate?: Date | null;
}

export interface CommitteeRepository {
  create(data: CreateCommitteeData): Promise<CommitteeRecord>;
  findById(id: string): Promise<CommitteeRecord | null>;
  update(id: string, data: UpdateCommitteeData): Promise<CommitteeRecord>;
  setStatus(id: string, status: CommitteeStatus): Promise<CommitteeRecord>;
  search(filters: CommitteeFilters, sort: CommitteeSort, pagination: PaginationInput): Promise<PaginatedResult<CommitteeRecord>>;
}

import type {
  EventFilters,
  EventRecord,
  EventSort,
  EventStatus,
  PaginatedResult,
  PaginationInput,
} from "../../domain/entities";

export interface CreateEventData {
  title: string;
  description?: string | null;
  startAt: Date;
  endAt?: Date | null;
  venue?: string | null;
  organizerId: string;
  budgetAmount?: string | null;
  budgetNotes?: string | null;
  shortDescription?: string | null;
  category?: string | null;
  isPublic?: boolean;
  featured?: boolean;
}

export interface UpdateEventData {
  title?: string;
  description?: string | null;
  startAt?: Date;
  endAt?: Date | null;
  venue?: string | null;
  budgetAmount?: string | null;
  budgetNotes?: string | null;
  postEventReport?: string | null;
  shortDescription?: string | null;
  category?: string | null;
  isPublic?: boolean;
  featured?: boolean;
  coverImageFileId?: string | null;
}

export interface EventRepository {
  create(data: CreateEventData): Promise<EventRecord>;
  findById(id: string): Promise<EventRecord | null>;
  update(id: string, data: UpdateEventData): Promise<EventRecord>;
  setStatus(id: string, status: EventStatus): Promise<EventRecord>;
  search(filters: EventFilters, sort: EventSort, pagination: PaginationInput): Promise<PaginatedResult<EventRecord>>;
}

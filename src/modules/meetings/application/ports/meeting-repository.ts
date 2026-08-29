import type {
  MeetingFilters,
  MeetingRecord,
  MeetingSort,
  MeetingStatus,
  PaginatedResult,
  PaginationInput,
} from "../../domain/entities";

export interface CreateMeetingData {
  title: string;
  agenda?: string | null;
  startAt: Date;
  venueOrLink?: string | null;
  organizerId: string;
  committeeId?: string | null;
}

export interface UpdateMeetingData {
  title?: string;
  agenda?: string | null;
  startAt?: Date;
  venueOrLink?: string | null;
  notes?: string | null;
  decisions?: string | null;
}

export interface MeetingRepository {
  create(data: CreateMeetingData): Promise<MeetingRecord>;
  findById(id: string): Promise<MeetingRecord | null>;
  update(id: string, data: UpdateMeetingData): Promise<MeetingRecord>;
  setStatus(id: string, status: MeetingStatus): Promise<MeetingRecord>;
  search(filters: MeetingFilters, sort: MeetingSort, pagination: PaginationInput): Promise<PaginatedResult<MeetingRecord>>;
}

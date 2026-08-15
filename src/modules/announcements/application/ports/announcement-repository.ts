import type {
  AnnouncementAudienceType,
  AnnouncementFilters,
  AnnouncementPriority,
  AnnouncementRecord,
  AnnouncementSort,
  PaginatedResult,
  PaginationInput,
} from "../../domain/entities";

export interface CreateAnnouncementData {
  title: string;
  content: string;
  priority?: AnnouncementPriority;
  audienceType: AnnouncementAudienceType;
  audienceValue?: string | null;
  publishAt?: Date;
  expiresAt?: Date | null;
  authorId: string;
}

export interface UpdateAnnouncementData {
  title?: string;
  content?: string;
  priority?: AnnouncementPriority;
  audienceType?: AnnouncementAudienceType;
  audienceValue?: string | null;
  publishAt?: Date;
  expiresAt?: Date | null;
}

export interface AnnouncementRepository {
  create(data: CreateAnnouncementData): Promise<AnnouncementRecord>;
  findById(id: string): Promise<AnnouncementRecord | null>;
  update(id: string, data: UpdateAnnouncementData): Promise<AnnouncementRecord>;
  delete(id: string): Promise<void>;
  search(filters: AnnouncementFilters, sort: AnnouncementSort, pagination: PaginationInput): Promise<PaginatedResult<AnnouncementRecord>>;
}

import type { AlumniRecord, AlumniSearchFilters } from "../../domain/entities";

export interface CreateAlumniData {
  studentProfileId?: string | null;
  fullName: string;
  graduationYear: number;
  currentCompany?: string | null;
  designation?: string | null;
  location?: string | null;
  portfolioUrl?: string | null;
  linkedInUrl?: string | null;
  mentorshipAvailable?: boolean;
}

export interface UpdateAlumniData {
  fullName?: string;
  graduationYear?: number;
  currentCompany?: string | null;
  designation?: string | null;
  location?: string | null;
  portfolioUrl?: string | null;
  linkedInUrl?: string | null;
  mentorshipAvailable?: boolean;
}

export interface AlumniRepository {
  create(data: CreateAlumniData): Promise<AlumniRecord>;
  findById(id: string): Promise<AlumniRecord | null>;
  update(id: string, data: UpdateAlumniData): Promise<AlumniRecord>;
  delete(id: string): Promise<void>;
  search(filters: AlumniSearchFilters): Promise<AlumniRecord[]>;
}

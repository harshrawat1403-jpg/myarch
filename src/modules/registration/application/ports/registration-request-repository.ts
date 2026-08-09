import type {
  RegistrationRequestRecord,
  RegistrationRequestSearchFilters,
  RegistrationSubmittedData,
} from "../../domain/entities";

export interface CreateRegistrationRequestData {
  email: string;
  fullName: string;
  rollNumber: string;
  batchId: string;
  submittedData: RegistrationSubmittedData;
}

export interface MarkRegistrationRequestData {
  status: "REVIEWED" | "NEEDS_ATTENTION";
  coordinatorComment: string;
  reviewedByUserId: string;
}

export interface DecideRegistrationRequestData {
  status: "APPROVED" | "REJECTED";
  decidedByUserId: string;
  rejectionReason?: string;
  resultingStudentProfileId?: string;
}

export interface RegistrationRequestRepository {
  create(data: CreateRegistrationRequestData): Promise<RegistrationRequestRecord>;
  findById(id: string): Promise<RegistrationRequestRecord | null>;
  /** Pending = SUBMITTED | REVIEWED | NEEDS_ATTENTION — not yet decided. */
  hasPendingByEmail(email: string): Promise<boolean>;
  hasPendingByRollNumber(rollNumber: string): Promise<boolean>;
  search(filters: RegistrationRequestSearchFilters): Promise<RegistrationRequestRecord[]>;
  mark(id: string, data: MarkRegistrationRequestData): Promise<RegistrationRequestRecord>;
  decide(id: string, data: DecideRegistrationRequestData): Promise<RegistrationRequestRecord>;
}

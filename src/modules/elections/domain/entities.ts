import type { ElectionConfig, ElectionStatus, PositionConfig } from "./election";
export interface ElectionRecord extends ElectionConfig {
  id: string;
  status: ElectionStatus;
  configurationLockedAt: Date | null;
  createdAt: Date;
  positions: (PositionConfig & { id: string })[];
  applicationForm: { formId: string; title: string; status: string } | null;
}
export interface CandidateRecord {
  id: string;
  electionId: string;
  applicationId: string;
  applicantUserId: string;
  applicantName: string;
  status: "APPLIED";
  createdAt: Date;
  positions: { id: string; title: string }[];
}

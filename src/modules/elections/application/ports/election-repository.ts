import type { ElectionConfig, PositionConfig } from "../../domain/election";
import type { CandidateRecord, ElectionRecord } from "../../domain/entities";
export interface ElectionRepository {
  list(includeDrafts: boolean): Promise<ElectionRecord[]>;
  get(id: string): Promise<ElectionRecord | null>;
  create(config: ElectionConfig, actorUserId: string): Promise<ElectionRecord>;
  update(id: string, config: ElectionConfig, actorUserId: string): Promise<ElectionRecord>;
  savePosition(
    id: string,
    positionId: string | null,
    config: PositionConfig,
    actorUserId: string,
  ): Promise<ElectionRecord>;
  deletePosition(id: string, positionId: string, actorUserId: string): Promise<ElectionRecord>;
  linkForm(id: string, formId: string, actorUserId: string): Promise<ElectionRecord>;
  transition(
    id: string,
    status: "APPLICATION_OPEN" | "APPLICATION_CLOSED",
    actorUserId: string,
  ): Promise<ElectionRecord>;
  candidates(id: string, applicantUserId?: string): Promise<CandidateRecord[]>;
  activeStudentUserIds(): Promise<string[]>;
}

import type { AuthenticatedActor } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import type { AuditRecorder } from "@/lib/audit";
import type { MeetingRecord } from "../../domain/entities";
import { canCreateMeeting } from "../../domain/permissions";
import type { MeetingRepository } from "../ports/meeting-repository";

export interface CreateMeetingInput {
  actor: AuthenticatedActor;
  title: string;
  agenda?: string | null;
  startAt: Date;
  venueOrLink?: string | null;
  organizerId?: string;
  committeeId?: string | null;
}

export class CreateMeetingUseCase {
  constructor(private readonly deps: { meetingRepository: MeetingRepository; auditRecorder: AuditRecorder }) {}

  async execute(input: CreateMeetingInput): Promise<MeetingRecord> {
    if (!canCreateMeeting(input.actor)) {
      throw new NotAuthorizedError("Not authorized to create a meeting");
    }

    const meeting = await this.deps.meetingRepository.create({
      title: input.title.trim(),
      agenda: input.agenda?.trim() ?? null,
      startAt: input.startAt,
      venueOrLink: input.venueOrLink?.trim() ?? null,
      organizerId: input.organizerId ?? input.actor.userId,
      committeeId: input.committeeId ?? null,
    });

    await this.deps.auditRecorder.record({
      actorUserId: input.actor.userId,
      action: AUDIT_ACTIONS.MEETING_CREATED,
      targetEntityType: "Meeting",
      targetEntityId: meeting.id,
      metadata: { title: meeting.title },
    });

    return meeting;
  }
}

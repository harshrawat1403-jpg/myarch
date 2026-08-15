import type { AuthenticatedActor } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import type { AuditRecorder } from "@/lib/audit";
import type { MeetingRecord } from "../../domain/entities";
import { canManageMeeting } from "../../domain/permissions";
import { MeetingNotFoundError } from "../../domain/errors";
import type { MeetingRepository, UpdateMeetingData } from "../ports/meeting-repository";

export interface UpdateMeetingInput extends UpdateMeetingData {
  actor: AuthenticatedActor;
  meetingId: string;
}

/** Covers general field edits AND filling in `notes`/`decisions` after the meeting has happened — no status gate, mirroring events' UpdateEventUseCase reasoning. */
export class UpdateMeetingUseCase {
  constructor(private readonly deps: { meetingRepository: MeetingRepository; auditRecorder: AuditRecorder }) {}

  async execute(input: UpdateMeetingInput): Promise<MeetingRecord> {
    const existing = await this.deps.meetingRepository.findById(input.meetingId);
    if (!existing) throw new MeetingNotFoundError();
    if (!canManageMeeting(input.actor, existing)) {
      throw new NotAuthorizedError("Not authorized to update this meeting");
    }

    const { actor: _actor, meetingId: _meetingId, ...data } = input;
    const updated = await this.deps.meetingRepository.update(input.meetingId, {
      ...data,
      title: data.title?.trim(),
      agenda: data.agenda !== undefined ? data.agenda?.trim() ?? null : undefined,
      venueOrLink: data.venueOrLink !== undefined ? data.venueOrLink?.trim() ?? null : undefined,
      notes: data.notes !== undefined ? data.notes?.trim() ?? null : undefined,
      decisions: data.decisions !== undefined ? data.decisions?.trim() ?? null : undefined,
    });

    await this.deps.auditRecorder.record({
      actorUserId: input.actor.userId,
      action: AUDIT_ACTIONS.MEETING_UPDATED,
      targetEntityType: "Meeting",
      targetEntityId: updated.id,
    });

    return updated;
  }
}

/** Composition root for the meetings module (MYARCH Phase 3, §4.4). */
import { prisma } from "@/lib/prisma";
import { PrismaAuditRecorder } from "@/lib/audit";
import { calendarSourceRegistry } from "@/modules/calendar";
import { PrismaMeetingRepository } from "./prisma-meeting-repository";
import { PrismaMeetingParticipantRepository } from "./prisma-meeting-participant-repository";
import { MeetingCalendarSource } from "./meeting-calendar-source";
import { CreateMeetingUseCase } from "../application/use-cases/create-meeting";
import { UpdateMeetingUseCase } from "../application/use-cases/update-meeting";
import { CompleteMeetingUseCase } from "../application/use-cases/complete-meeting";
import { CancelMeetingUseCase } from "../application/use-cases/cancel-meeting";
import { GetMeetingUseCase } from "../application/use-cases/get-meeting";
import { SearchMeetingsUseCase } from "../application/use-cases/search-meetings";
import { AddMeetingParticipantUseCase } from "../application/use-cases/add-participant";
import { RemoveMeetingParticipantUseCase } from "../application/use-cases/remove-participant";
import { MarkMeetingAttendanceUseCase } from "../application/use-cases/mark-attendance";

const meetingRepository = new PrismaMeetingRepository(prisma);
const meetingParticipantRepository = new PrismaMeetingParticipantRepository(prisma);
const auditRecorder = new PrismaAuditRecorder(prisma);

calendarSourceRegistry.register(new MeetingCalendarSource({ meetingRepository }));

export const createMeetingUseCase = new CreateMeetingUseCase({ meetingRepository, auditRecorder });
export const updateMeetingUseCase = new UpdateMeetingUseCase({ meetingRepository, auditRecorder });
export const completeMeetingUseCase = new CompleteMeetingUseCase({ meetingRepository, auditRecorder });
export const cancelMeetingUseCase = new CancelMeetingUseCase({ meetingRepository, auditRecorder });
export const getMeetingUseCase = new GetMeetingUseCase({ meetingRepository, meetingParticipantRepository });
export const searchMeetingsUseCase = new SearchMeetingsUseCase({ meetingRepository });
export const addMeetingParticipantUseCase = new AddMeetingParticipantUseCase({
  meetingRepository,
  meetingParticipantRepository,
  auditRecorder,
});
export const removeMeetingParticipantUseCase = new RemoveMeetingParticipantUseCase({
  meetingRepository,
  meetingParticipantRepository,
  auditRecorder,
});
export const markMeetingAttendanceUseCase = new MarkMeetingAttendanceUseCase({
  meetingRepository,
  meetingParticipantRepository,
  auditRecorder,
});

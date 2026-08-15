/** Composition root for the events module (MYARCH Phase 3, §4.2/§4.3). */
import { prisma } from "@/lib/prisma";
import { PrismaAuditRecorder } from "@/lib/audit";
import { saveFile } from "@/lib/file-storage";
import { calendarSourceRegistry } from "@/modules/calendar";
import { PrismaEventRepository } from "./prisma-event-repository";
import { PrismaEventParticipantRepository } from "./prisma-event-participant-repository";
import { PrismaEventChecklistRepository } from "./prisma-event-checklist-repository";
import { PrismaEventAttachmentRepository } from "./prisma-event-attachment-repository";
import { PrismaEventRegistrationRepository } from "./prisma-event-registration-repository";
import { EventCalendarSource } from "./event-calendar-source";
import { CreateEventUseCase } from "../application/use-cases/create-event";
import { UpdateEventUseCase } from "../application/use-cases/update-event";
import { PublishEventUseCase } from "../application/use-cases/publish-event";
import { CompleteEventUseCase } from "../application/use-cases/complete-event";
import { CancelEventUseCase } from "../application/use-cases/cancel-event";
import { GetEventUseCase } from "../application/use-cases/get-event";
import { SearchEventsUseCase } from "../application/use-cases/search-events";
import { AddEventParticipantUseCase } from "../application/use-cases/add-participant";
import { RemoveEventParticipantUseCase } from "../application/use-cases/remove-participant";
import { AddEventChecklistItemUseCase } from "../application/use-cases/add-checklist-item";
import { ToggleEventChecklistItemUseCase } from "../application/use-cases/toggle-checklist-item";
import { RemoveEventChecklistItemUseCase } from "../application/use-cases/remove-checklist-item";
import { AddEventAttachmentUseCase } from "../application/use-cases/add-attachment";
import { RegisterForEventUseCase } from "../application/use-cases/register-for-event";
import { MarkEventAttendanceUseCase } from "../application/use-cases/mark-attendance";

const eventRepository = new PrismaEventRepository(prisma);
const eventParticipantRepository = new PrismaEventParticipantRepository(prisma);
const eventChecklistRepository = new PrismaEventChecklistRepository(prisma);
export const eventAttachmentRepository = new PrismaEventAttachmentRepository(prisma);
const eventRegistrationRepository = new PrismaEventRegistrationRepository(prisma);
const auditRecorder = new PrismaAuditRecorder(prisma);

// Registers Events with the Central Activity Calendar (§4.1) — mirrors
// jobs' own "consuming module registers itself into the shared registry"
// pattern.
calendarSourceRegistry.register(new EventCalendarSource({ eventRepository }));

export const createEventUseCase = new CreateEventUseCase({ eventRepository, auditRecorder });
export const updateEventUseCase = new UpdateEventUseCase({ eventRepository, auditRecorder });
export const publishEventUseCase = new PublishEventUseCase({ eventRepository, auditRecorder });
export const completeEventUseCase = new CompleteEventUseCase({ eventRepository, auditRecorder });
export const cancelEventUseCase = new CancelEventUseCase({ eventRepository, auditRecorder });
export const getEventUseCase = new GetEventUseCase({
  eventRepository,
  eventParticipantRepository,
  eventChecklistRepository,
  eventAttachmentRepository,
  eventRegistrationRepository,
});
export const searchEventsUseCase = new SearchEventsUseCase({ eventRepository });
export const addEventParticipantUseCase = new AddEventParticipantUseCase({
  eventRepository,
  eventParticipantRepository,
  auditRecorder,
});
export const removeEventParticipantUseCase = new RemoveEventParticipantUseCase({
  eventRepository,
  eventParticipantRepository,
  auditRecorder,
});
export const addEventChecklistItemUseCase = new AddEventChecklistItemUseCase({ eventRepository, eventChecklistRepository });
export const toggleEventChecklistItemUseCase = new ToggleEventChecklistItemUseCase({
  eventRepository,
  eventChecklistRepository,
});
export const removeEventChecklistItemUseCase = new RemoveEventChecklistItemUseCase({
  eventRepository,
  eventChecklistRepository,
});
export const addEventAttachmentUseCase = new AddEventAttachmentUseCase({
  eventRepository,
  eventAttachmentRepository,
  auditRecorder,
  saveFile,
});
export const registerForEventUseCase = new RegisterForEventUseCase({
  eventRepository,
  eventRegistrationRepository,
  auditRecorder,
});
export const markEventAttendanceUseCase = new MarkEventAttendanceUseCase({
  eventRepository,
  eventRegistrationRepository,
  auditRecorder,
});

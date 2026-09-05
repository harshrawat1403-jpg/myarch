import type { AuthenticatedActor } from "@/modules/auth";
import type { NotificationService } from "@/modules/notifications";
import { NotAuthorizedError } from "@/lib/errors";
import {
  electionConfigSchema,
  positionSchema,
  validateSchedule,
  validateWeights,
  ElectionError,
} from "../domain/election";
import type { ElectionRepository } from "./ports/election-repository";

export function requireSecretary(actor: AuthenticatedActor): void {
  if (actor.role !== "SECRETARY")
    throw new NotAuthorizedError("Only the Secretary may administer elections");
}
function requireReader(actor: AuthenticatedActor): void {
  if (actor.role !== "SECRETARY" && actor.role !== "STUDENT")
    throw new NotAuthorizedError("Election access is limited to students and the Secretary");
}
export class ElectionUseCases {
  constructor(
    private readonly repository: ElectionRepository,
    private readonly notifications: NotificationService,
  ) {}
  async list(actor: AuthenticatedActor) {
    requireReader(actor);
    return this.repository.list(actor.role === "SECRETARY");
  }
  async get(actor: AuthenticatedActor, id: string) {
    requireReader(actor);
    const election = await this.repository.get(id);
    if (!election || (actor.role !== "SECRETARY" && election.status === "DRAFT"))
      throw new ElectionError("Election not found", "notFound");
    return election;
  }
  async create(actor: AuthenticatedActor, input: unknown) {
    requireSecretary(actor);
    const config = electionConfigSchema.parse(input);
    validateSchedule(config);
    return this.repository.create(config, actor.userId);
  }
  async update(actor: AuthenticatedActor, id: string, input: unknown) {
    requireSecretary(actor);
    const config = electionConfigSchema.parse(input);
    validateSchedule(config);
    return this.repository.update(id, config, actor.userId);
  }
  async savePosition(
    actor: AuthenticatedActor,
    id: string,
    positionId: string | null,
    input: unknown,
  ) {
    requireSecretary(actor);
    const position = positionSchema.parse(input);
    validateWeights(position.weights);
    return this.repository.savePosition(id, positionId, position, actor.userId);
  }
  async deletePosition(actor: AuthenticatedActor, id: string, positionId: string) {
    requireSecretary(actor);
    return this.repository.deletePosition(id, positionId, actor.userId);
  }
  async linkForm(actor: AuthenticatedActor, id: string, formId: string) {
    requireSecretary(actor);
    return this.repository.linkForm(id, formId, actor.userId);
  }
  async transition(
    actor: AuthenticatedActor,
    id: string,
    status: "APPLICATION_OPEN" | "APPLICATION_CLOSED",
  ) {
    requireSecretary(actor);
    const election = await this.repository.transition(id, status, actor.userId);
    if (status === "APPLICATION_OPEN") {
      const recipients = await this.repository.activeStudentUserIds();
      await Promise.all(
        recipients.map((recipientUserId) =>
          this.notifications.notify({
            recipientUserId,
            template: "ELECTION_APPLICATION_OPENED",
            context: {
              electionId: id,
              title: election.title,
              deadline: election.applicationCloseAt.toISOString(),
            },
          }),
        ),
      );
    }
    return election;
  }
  async candidates(actor: AuthenticatedActor, id: string) {
    await this.get(actor, id);
    return this.repository.candidates(id, actor.role === "SECRETARY" ? undefined : actor.userId);
  }
}

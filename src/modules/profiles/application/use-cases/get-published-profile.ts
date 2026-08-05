import type { AuthenticatedActor } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import { StudentNotFoundError } from "@/modules/students";
import type { PublishedProfile } from "../../domain/entities";
import { PublishedProfileNotFoundError } from "../../domain/errors";
import type { PublishedProfileRepository } from "../ports/published-profile-repository";
import type { StudentLookup } from "../ports/student-lookup";

export interface GetPublishedProfileInput {
  actor: AuthenticatedActor;
  studentId: string;
}

/**
 * Deliberately NOT gated by `canViewApprovedPublicProfile` — that function
 * (docs/security/09_User_Roles_and_Permissions.md) also permits Recruiters,
 * because it is meant to cover the future recruiter directory too (Days
 * 8–9). That directory doesn't exist yet, and its actual design (search
 * across many students, never a raw ID lookup) hasn't been built — reusing
 * that function here would open a Recruiter-accessible, single-student
 * lookup endpoint years ahead of the feature it's meant to serve, and
 * before this project ever decided a Recruiter should be able to fetch a
 * profile by ID directly. This endpoint is scoped instead to exactly
 * Secretary / in-scope Coordinator / the student themself, matching every
 * other endpoint this module exposes.
 */
export class GetPublishedProfileUseCase {
  constructor(
    private readonly deps: {
      publishedProfileRepository: PublishedProfileRepository;
      studentLookup: StudentLookup;
    },
  ) {}

  async execute(input: GetPublishedProfileInput): Promise<PublishedProfile> {
    const student = await this.deps.studentLookup.findById(input.studentId);
    if (!student) {
      throw new StudentNotFoundError();
    }

    const isSelf = input.actor.role === "STUDENT" && input.actor.studentProfileId === student.id;
    const isSecretary = input.actor.role === "SECRETARY";
    const isInScopeCoordinator =
      input.actor.role === "COORDINATOR" && (input.actor.batchScope ?? []).includes(student.batchId);

    if (!isSelf && !isSecretary && !isInScopeCoordinator) {
      throw new NotAuthorizedError("Not authorized to view this student's published profile");
    }

    const profile = await this.deps.publishedProfileRepository.findByStudentId(input.studentId);
    if (!profile) {
      throw new PublishedProfileNotFoundError();
    }

    return profile;
  }
}

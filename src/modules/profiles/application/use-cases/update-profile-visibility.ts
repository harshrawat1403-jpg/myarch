import type { AuthenticatedActor } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import { StudentNotFoundError } from "@/modules/students";
import type { PublishedProfile } from "../../domain/entities";
import { PublishedProfileNotFoundError } from "../../domain/errors";
import type { PublishedProfileRepository } from "../ports/published-profile-repository";
import type { StudentLookup } from "../ports/student-lookup";

export interface UpdateProfileVisibilityInput {
  actor: AuthenticatedActor;
  studentId: string;
  isPubliclyDiscoverable?: boolean;
  showCgpa?: boolean;
}

/**
 * V4.0 B4 — self-service only: a student controls their own visibility
 * settings, never a Secretary/Coordinator on their behalf (this is
 * deliberately narrower than GetPublishedProfileUseCase's access list —
 * "students control their own visibility" per §7 means exactly the owner,
 * not staff acting for them).
 */
export class UpdateProfileVisibilityUseCase {
  constructor(
    private readonly deps: { publishedProfileRepository: PublishedProfileRepository; studentLookup: StudentLookup },
  ) {}

  async execute(input: UpdateProfileVisibilityInput): Promise<PublishedProfile> {
    const student = await this.deps.studentLookup.findById(input.studentId);
    if (!student) throw new StudentNotFoundError();

    const isSelf = input.actor.role === "STUDENT" && input.actor.studentProfileId === student.id;
    if (!isSelf) {
      throw new NotAuthorizedError("Not authorized to change this profile's visibility settings");
    }

    const existing = await this.deps.publishedProfileRepository.findByStudentId(input.studentId);
    if (!existing) throw new PublishedProfileNotFoundError();

    return this.deps.publishedProfileRepository.updateVisibility(input.studentId, {
      isPubliclyDiscoverable: input.isPubliclyDiscoverable,
      showCgpa: input.showCgpa,
    });
  }
}

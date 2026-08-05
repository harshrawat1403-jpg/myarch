import type { AuthenticatedActor } from "@/modules/auth";
import { canEditPrivateAdminFields } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import type { StudentPrivateFields, StudentRecord } from "../../domain/entities";
import {
  BatchNotAssignableError,
  BatchNotFoundError,
  DuplicateEmailError,
  DuplicateRollNumberError,
} from "../../domain/errors";
import type { BatchLookup } from "../ports/batch-lookup";
import type { StudentRepository } from "../ports/student-repository";
import type { UserProvisioner } from "../ports/user-provisioner";

export interface CreateStudentInput {
  actor: AuthenticatedActor;
  email: string;
  fullName: string;
  rollNumber: string;
  batchId: string;
  private?: Partial<StudentPrivateFields>;
}

export interface CreateStudentUseCaseDeps {
  studentRepository: StudentRepository;
  batchLookup: BatchLookup;
  userProvisioner: UserProvisioner;
}

export class CreateStudentUseCase {
  constructor(private readonly deps: CreateStudentUseCaseDeps) {}

  async execute(input: CreateStudentInput): Promise<StudentRecord> {
    if (!canEditPrivateAdminFields(input.actor, input.batchId)) {
      throw new NotAuthorizedError("Not authorized to create a student in this batch");
    }

    const batch = await this.deps.batchLookup.findById(input.batchId);
    if (!batch) {
      throw new BatchNotFoundError();
    }
    if (batch.status === "ARCHIVED") {
      throw new BatchNotAssignableError("this batch is archived");
    }

    const existingByRollNumber = await this.deps.studentRepository.findByRollNumber(
      input.rollNumber,
    );
    if (existingByRollNumber) {
      throw new DuplicateRollNumberError(input.rollNumber);
    }

    let userId: string;
    try {
      const provisioned = await this.deps.userProvisioner.provisionStudentUser(input.email);
      userId = provisioned.userId;
    } catch (err) {
      // The Prisma-backed provisioner surfaces a unique-constraint violation
      // on email as a plain error; translate it to a typed domain error here
      // rather than letting a raw database error escape the Application layer.
      if (isUniqueConstraintViolation(err)) {
        throw new DuplicateEmailError(input.email);
      }
      throw err;
    }

    return this.deps.studentRepository.create({
      userId,
      batchId: input.batchId,
      rollNumber: input.rollNumber,
      fullName: input.fullName,
      private: input.private ?? {},
      actorUserId: input.actor.userId,
    });
  }
}

function isUniqueConstraintViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: unknown }).code === "P2002"
  );
}

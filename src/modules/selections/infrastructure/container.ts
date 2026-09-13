import { prisma } from "@/lib/prisma";
import { notificationService } from "@/modules/notifications";
import { CoreCommitteeSelectionUseCases } from "../application/core-committee-selection-use-cases";
import { StudentCoreCommitteeSelectionUseCases } from "../application/student-core-committee-selection-use-cases";
import { PrismaCoreCommitteeSelectionRepository } from "./prisma-core-committee-selection-repository";
const coreCommitteeSelectionRepository = new PrismaCoreCommitteeSelectionRepository(prisma);
export const coreCommitteeSelectionUseCases = new CoreCommitteeSelectionUseCases(
  coreCommitteeSelectionRepository,
  notificationService,
);
// Applications already depend on the Core candidate-association helper. Keep this
// dependency lazy so the two composition roots do not initialize cyclically.
export const studentCoreCommitteeSelectionUseCases = new StudentCoreCommitteeSelectionUseCases(
  coreCommitteeSelectionRepository,
  {
    execute: async (input) => {
      const { submitFormUseCase } = await import("@/modules/applications/infrastructure/container");
      return submitFormUseCase.execute(input);
    },
  },
);

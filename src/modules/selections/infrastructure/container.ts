import { prisma } from "@/lib/prisma";
import { CoreCommitteeSelectionUseCases } from "../application/core-committee-selection-use-cases";
import { PrismaCoreCommitteeSelectionRepository } from "./prisma-core-committee-selection-repository";
export const coreCommitteeSelectionUseCases = new CoreCommitteeSelectionUseCases(
  new PrismaCoreCommitteeSelectionRepository(prisma),
);

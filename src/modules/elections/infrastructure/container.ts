import { prisma } from "@/lib/prisma";
import { notificationService } from "@/modules/notifications";
import { ElectionUseCases } from "../application/election-use-cases";
import { PrismaElectionRepository } from "./prisma-election-repository";
export const electionUseCases = new ElectionUseCases(
  new PrismaElectionRepository(prisma),
  notificationService,
);

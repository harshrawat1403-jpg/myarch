import { prisma } from "@/lib/prisma";
import { CreateBatchUseCase } from "../application/use-cases/create-batch";
import { UpdateBatchUseCase } from "../application/use-cases/update-batch";
import { UpdateBatchStatusUseCase } from "../application/use-cases/update-batch-status";
import { ListBatchesUseCase } from "../application/use-cases/list-batches";
import { GetBatchUseCase } from "../application/use-cases/get-batch";
import { PrismaBatchRepository } from "./prisma-batch-repository";

// No secrets/config required for this module — safe to construct eagerly,
// unlike the auth module's composition root (see
// src/modules/auth/infrastructure/container.ts for why that one is lazy).
export const batchRepository = new PrismaBatchRepository(prisma);

export const createBatchUseCase = new CreateBatchUseCase({ batchRepository });
export const updateBatchUseCase = new UpdateBatchUseCase({ batchRepository });
export const updateBatchStatusUseCase = new UpdateBatchStatusUseCase({ batchRepository });
export const listBatchesUseCase = new ListBatchesUseCase({ batchRepository });
export const getBatchUseCase = new GetBatchUseCase({ batchRepository });

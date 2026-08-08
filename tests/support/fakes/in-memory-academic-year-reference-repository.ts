import type {
  AcademicYearReferenceRepository,
  BatchReference,
  CoordinatorReference,
} from "../../../src/modules/academic-year/application/ports/academic-year-reference-repository";

export class InMemoryAcademicYearReferenceRepository implements AcademicYearReferenceRepository {
  private readonly batches = new Map<string, BatchReference>();
  private readonly coordinators = new Map<string, CoordinatorReference>();

  seedBatch(batch: BatchReference): void {
    this.batches.set(batch.id, batch);
  }

  seedCoordinator(coordinator: CoordinatorReference): void {
    this.coordinators.set(coordinator.id, coordinator);
  }

  async findBatchById(id: string): Promise<BatchReference | null> {
    return this.batches.get(id) ?? null;
  }

  async findCoordinatorById(id: string): Promise<CoordinatorReference | null> {
    return this.coordinators.get(id) ?? null;
  }
}

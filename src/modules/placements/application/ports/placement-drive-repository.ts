import type {
  CreatePlacementDriveData,
  PlacementDriveRecord,
  PlacementDriveSearchFilters,
  PlacementDriveStatus,
  UpdatePlacementDriveData,
} from "../../domain/entities";

export interface PlacementDriveRepository {
  create(data: CreatePlacementDriveData): Promise<PlacementDriveRecord>;
  findById(id: string): Promise<PlacementDriveRecord | null>;
  update(id: string, data: UpdatePlacementDriveData): Promise<PlacementDriveRecord>;
  setStatus(id: string, status: PlacementDriveStatus): Promise<PlacementDriveRecord>;
  search(filters: PlacementDriveSearchFilters): Promise<PlacementDriveRecord[]>;
}

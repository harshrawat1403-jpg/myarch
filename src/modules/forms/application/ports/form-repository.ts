import type { CreateFormData, FormFilters, FormRecord, FormStatus, UpdateFormData } from "../../domain/entities";

export interface FormRepository {
  create(data: CreateFormData): Promise<FormRecord>;
  findById(id: string): Promise<FormRecord | null>;
  update(id: string, data: UpdateFormData): Promise<FormRecord>;
  setStatus(id: string, status: FormStatus, at: Date): Promise<FormRecord>;
  search(filters: FormFilters): Promise<readonly FormRecord[]>;
  isCoreCommitteeSelectionForm(id: string): Promise<boolean>;
}

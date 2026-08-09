import type { AuthenticatedActor } from "@/modules/auth";
import { canManagePublications } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import type { PublicationDataBindingKind } from "../../domain/blocks";
import type {
  PublicationDataLookup,
  SelectableAlumniOption,
  SelectableCompanyOption,
  SelectableStudentOption,
} from "../ports/publication-data-lookup";

export type SelectableDataResult =
  | { readonly kind: "STUDENTS"; readonly options: SelectableStudentOption[] }
  | { readonly kind: "COMPANIES"; readonly options: SelectableCompanyOption[] }
  | { readonly kind: "ALUMNI"; readonly options: SelectableAlumniOption[] }
  | { readonly kind: "STATS" | "NONE"; readonly options: [] };

/** V4.0 E4 (§13.1 step 2) — backs the "Select Data" wizard step, one call per template's own data-binding kind. */
export class ListSelectableDataUseCase {
  constructor(private readonly deps: { dataLookup: PublicationDataLookup }) {}

  async execute(actor: AuthenticatedActor, kind: PublicationDataBindingKind, batchId?: string): Promise<SelectableDataResult> {
    if (!canManagePublications(actor)) throw new NotAuthorizedError("Not authorized to view publication data");

    switch (kind) {
      case "STUDENTS":
        return { kind, options: await this.deps.dataLookup.listSelectableStudents(batchId) };
      case "COMPANIES":
        return { kind, options: await this.deps.dataLookup.listSelectableCompanies() };
      case "ALUMNI":
        return { kind, options: await this.deps.dataLookup.listSelectableAlumni() };
      case "STATS":
      case "NONE":
        return { kind, options: [] };
    }
  }
}

import type { ResolvedAlumniProfile, ResolvedCompany, ResolvedStats, ResolvedStudentProfile } from "../../domain/entities";

export interface SelectableStudentOption {
  readonly studentProfileId: string;
  readonly fullName: string;
  readonly batchId: string;
  readonly batchName: string;
}

export interface SelectableCompanyOption {
  readonly companyId: string;
  readonly name: string;
}

export interface SelectableAlumniOption {
  readonly alumniProfileId: string;
  readonly fullName: string;
  readonly graduationYear: number;
}

/**
 * V4.0 E3-E4 (§13.1 step 2) — the one port through which the publications
 * module reads real platform data, for both the "select data" step (the
 * list-prefixed methods) and live rendering (the resolve-prefixed methods
 * plus computeStats, called at preview/export time so a data-bound block is
 * never stale). Deliberately one cohesive port rather than four — this
 * module never imports the profiles/companies/alumni modules' Application
 * layers directly (module isolation, same rule every other cross-module
 * lookup in this codebase already follows).
 */
export interface PublicationDataLookup {
  listSelectableStudents(batchId?: string): Promise<SelectableStudentOption[]>;
  resolveStudents(studentProfileIds: readonly string[]): Promise<ResolvedStudentProfile[]>;

  listSelectableCompanies(): Promise<SelectableCompanyOption[]>;
  resolveCompanies(companyIds: readonly string[]): Promise<ResolvedCompany[]>;

  listSelectableAlumni(): Promise<SelectableAlumniOption[]>;
  resolveAlumni(alumniProfileIds: readonly string[]): Promise<ResolvedAlumniProfile[]>;

  computeStats(): Promise<ResolvedStats>;
}

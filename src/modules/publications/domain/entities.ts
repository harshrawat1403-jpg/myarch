import type { PublicationBlock, PublicationContent, PublicationDataBindingKind } from "./blocks";

export type PublicationType = "BROCHURE" | "BOOKLET" | "PORTFOLIO_BOOK" | "ANNUAL_REPORT" | "NEWSLETTER" | "MAGAZINE" | "CUSTOM";
export type PublicationStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
export type PublicationTemplateStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";
export type PublicationPageSize = "A4_PORTRAIT" | "A4_LANDSCAPE" | "A3" | "CUSTOM";
export type PublicationExportFormat = "PDF" | "PPTX" | "PNG" | "JPEG";
export type PublicationExportStatus = "PENDING" | "GENERATING" | "READY" | "FAILED";

/** The frozen skeleton a new Publication is created from (§13.1 step 1-2). */
export interface PublicationTemplateStructure {
  readonly dataBinding: PublicationDataBindingKind;
  readonly defaultStyle: PublicationContent["style"];
  readonly baseBlocks: readonly PublicationBlock[];
  /** Auto-populated data-bound blocks are spliced in immediately after this block id. Null means "append at the end" (only valid when baseBlocks is non-empty). */
  readonly insertDataBlocksAfterBlockId: string | null;
}

export interface PublicationTemplateRecord {
  readonly id: string;
  readonly name: string;
  readonly type: PublicationType;
  readonly description: string | null;
  readonly thumbnailFileId: string | null;
  readonly structure: PublicationTemplateStructure;
  readonly status: PublicationTemplateStatus;
  readonly createdByUserId: string;
  readonly createdAt: Date;
}

export interface PublicationRecord {
  readonly id: string;
  readonly title: string;
  readonly type: PublicationType;
  readonly status: PublicationStatus;
  readonly templateId: string | null;
  readonly content: PublicationContent;
  readonly pageSize: PublicationPageSize;
  readonly customDimensions: { readonly widthPt: number; readonly heightPt: number } | null;
  readonly version: number;
  readonly createdByUserId: string;
  readonly lastEditedByUserId: string;
  readonly lastEditedAt: Date;
  readonly createdAt: Date;
}

/** A lighter row for list/search views — avoids shipping every publication's full block tree over the wire just to render a list. */
export interface PublicationSummaryDTO {
  readonly id: string;
  readonly title: string;
  readonly type: PublicationType;
  readonly status: PublicationStatus;
  readonly templateName: string | null;
  readonly lastEditedAt: Date;
  readonly createdAt: Date;
}

export interface PublicationVersionRecord {
  readonly id: string;
  readonly publicationId: string;
  readonly versionNumber: number;
  readonly content: PublicationContent;
  readonly label: string | null;
  readonly createdByUserId: string;
  readonly createdAt: Date;
}

export interface PublicationExportRecord {
  readonly id: string;
  readonly publicationId: string;
  readonly format: PublicationExportFormat;
  readonly status: PublicationExportStatus;
  readonly fileId: string | null;
  readonly errorMessage: string | null;
  readonly generatedByUserId: string;
  readonly requestedAt: Date;
  readonly completedAt: Date | null;
}

// --- Live-resolved data-binding shapes (§13.1 step 2: "never copy-pasted") ---

export interface ResolvedStudentProfile {
  readonly studentProfileId: string;
  readonly fullName: string;
  readonly batchName: string;
  readonly bio: string | null;
  readonly skills: readonly string[];
  readonly software: readonly string[];
  readonly portfolioLinks: readonly string[];
  /** Raw FileAsset id — resolved to a real `<img src>` by the renderer's injected `resolveImageSrc`, uniformly with every other image reference. Never a pre-built URL here. */
  readonly photoFileId: string | null;
}

export interface ResolvedCompany {
  readonly companyId: string;
  readonly name: string;
  readonly sector: string | null;
  readonly logoFileId: string | null;
}

export interface ResolvedAlumniProfile {
  readonly alumniProfileId: string;
  readonly fullName: string;
  readonly graduationYear: number;
  readonly currentCompany: string | null;
  readonly designation: string | null;
  readonly location: string | null;
}

export interface ResolvedStats {
  readonly totalApplications: number;
  readonly totalOffers: number;
  readonly totalPlaced: number;
  readonly totalDrives: number;
  readonly totalCompanies: number;
}

/** §13.4/§19 — exports are always background-job-produced, never generated inline in a request. This is the first job-dispatched file-generation feature in the codebase (src/modules/exports/ is synchronous); registered/handled the same way SEND_NOTIFICATION already is. */
export const GENERATE_PUBLICATION_EXPORT_JOB_TYPE = "GENERATE_PUBLICATION_EXPORT";

export interface GeneratePublicationExportJobPayload {
  readonly exportId: string;
  readonly publicationId: string;
  readonly format: PublicationExportFormat;
}

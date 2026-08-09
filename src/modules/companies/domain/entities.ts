/**
 * Framework-free Domain layer types for the companies module (V4.0 A4) —
 * mirrors coordinators/domain/entities.ts's shape conventions. Company is a
 * pure directory record (docs/planning/V4_0_PRD.md §24 Q5), not a
 * login-capable entity — no userId, no email.
 */

export interface CompanyRecord {
  readonly id: string;
  readonly name: string;
  readonly sector: string | null;
  readonly website: string | null;
  readonly logoFileId: string | null;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface CompanySearchFilters {
  readonly name?: string;
  readonly includeInactive?: boolean;
}

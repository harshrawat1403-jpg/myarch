export type FormStatus = "DRAFT" | "PUBLISHED" | "CLOSED" | "ARCHIVED";
export type FormFieldType = "TEXT" | "LONG_TEXT" | "NUMBER" | "EMAIL" | "DROPDOWN" | "RADIO" | "CHECKBOX" | "DATE";

export interface FormFieldValidation {
  readonly min?: number;
  readonly max?: number;
}

export interface FormFieldRecord {
  readonly id: string;
  readonly formId: string;
  readonly key: string;
  readonly label: string;
  readonly type: FormFieldType;
  readonly description: string | null;
  readonly required: boolean;
  readonly options: readonly string[];
  readonly validation: FormFieldValidation | null;
  readonly displayOrder: number;
}

export interface FormRecord {
  readonly electionId?: string | null;
  readonly id: string;
  readonly title: string;
  readonly description: string | null;
  readonly status: FormStatus;
  readonly deadline: Date | null;
  readonly committeeId: string | null;
  readonly createdByUserId: string;
  readonly publishedAt: Date | null;
  readonly closedAt: Date | null;
  readonly archivedAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly fields: readonly FormFieldRecord[];
}

export interface CreateFormData {
  readonly title: string;
  readonly description?: string | null;
  readonly deadline?: Date | null;
  readonly committeeId?: string | null;
  readonly createdByUserId: string;
  readonly fields: readonly CreateFormFieldData[];
}

export interface CreateFormFieldData {
  readonly key: string;
  readonly label: string;
  readonly type: FormFieldType;
  readonly description?: string | null;
  readonly required?: boolean;
  readonly options?: readonly string[];
  readonly validation?: FormFieldValidation | null;
  readonly displayOrder: number;
}

export interface UpdateFormData {
  readonly title?: string;
  readonly description?: string | null;
  readonly deadline?: Date | null;
  readonly committeeId?: string | null;
  readonly fields?: readonly CreateFormFieldData[];
}

export interface FormFilters {
  readonly status?: FormStatus;
  readonly search?: string;
  /** Keeps governance-owned Core Committee intake forms out of the student generic Forms catalogue. */
  readonly excludeCoreCommitteeSelectionForms?: boolean;
}

export const FORM_TITLE_MAX_LENGTH = 200;
export const FORM_DESCRIPTION_MAX_LENGTH = 5000;
export const FORM_FIELD_KEY_MAX_LENGTH = 80;
export const FORM_FIELD_LABEL_MAX_LENGTH = 200;
export const FORM_FIELD_DESCRIPTION_MAX_LENGTH = 1000;
export const FORM_OPTION_MAX_LENGTH = 200;
export const FORM_MAX_FIELDS = 100;
export const FORM_MAX_OPTIONS = 100;
export const FORM_APPLICATION_REVIEW_NOTES_MAX_LENGTH = 5000;
export const FORM_APPLICATION_DECISION_REASON_MAX_LENGTH = 2000;

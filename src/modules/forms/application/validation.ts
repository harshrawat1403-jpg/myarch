import type { CreateFormFieldData, FormFieldType, FormFieldValidation } from "../domain/entities";
import { FORM_FIELD_KEY_MAX_LENGTH, FORM_FIELD_LABEL_MAX_LENGTH, FORM_MAX_FIELDS, FORM_MAX_OPTIONS, FORM_OPTION_MAX_LENGTH } from "../domain/entities";
import { InvalidFormDefinitionError } from "../domain/errors";

const OPTION_TYPES: readonly FormFieldType[] = ["DROPDOWN", "RADIO"];

export function validateFieldDefinitions(fields: readonly CreateFormFieldData[]): void {
  if (fields.length === 0) throw new InvalidFormDefinitionError("A form must contain at least one field");
  if (fields.length > FORM_MAX_FIELDS) throw new InvalidFormDefinitionError(`A form cannot contain more than ${FORM_MAX_FIELDS} fields`);

  const keys = new Set<string>();
  fields.forEach((field, index) => {
    if (!field.key || field.key.length > FORM_FIELD_KEY_MAX_LENGTH) {
      throw new InvalidFormDefinitionError("Every field needs a unique key within the allowed length");
    }
    if (keys.has(field.key)) throw new InvalidFormDefinitionError(`Duplicate field key: ${field.key}`);
    keys.add(field.key);
    if (!field.label || field.label.length > FORM_FIELD_LABEL_MAX_LENGTH) {
      throw new InvalidFormDefinitionError("Every field needs a label within the allowed length");
    }
    if (field.displayOrder !== index) throw new InvalidFormDefinitionError("Field display order must be contiguous");

    const options = field.options ?? [];
    if (options.length > FORM_MAX_OPTIONS) throw new InvalidFormDefinitionError(`A field cannot contain more than ${FORM_MAX_OPTIONS} options`);
    if (!OPTION_TYPES.includes(field.type) && options.length > 0) {
      throw new InvalidFormDefinitionError(`${field.type} fields cannot define options`);
    }
    if (OPTION_TYPES.includes(field.type) && options.length === 0) {
      throw new InvalidFormDefinitionError(`${field.type} fields require at least one option`);
    }
    if (options.some((option) => !option.trim() || option.length > FORM_OPTION_MAX_LENGTH)) {
      throw new InvalidFormDefinitionError("Field options must be non-empty and within the allowed length");
    }
    validateFieldValidation(field.validation ?? null);
  });
}

function validateFieldValidation(validation: FormFieldValidation | null): void {
  if (!validation) return;
  if (validation.min !== undefined && !Number.isFinite(validation.min)) throw new InvalidFormDefinitionError("Validation minimum must be finite");
  if (validation.max !== undefined && !Number.isFinite(validation.max)) throw new InvalidFormDefinitionError("Validation maximum must be finite");
  if (validation.min !== undefined && validation.max !== undefined && validation.min > validation.max) {
    throw new InvalidFormDefinitionError("Validation minimum cannot exceed maximum");
  }
}


import type { FormFieldRecord } from "@/modules/forms";
import { InvalidFormAnswerError } from "../domain/errors";

export function validateFormAnswers(fields: readonly FormFieldRecord[], answers: Record<string, unknown>): void {
  const knownKeys = new Set(fields.map((field) => field.key));
  for (const key of Object.keys(answers)) {
    if (!knownKeys.has(key)) throw new InvalidFormAnswerError(`Unknown form field: ${key}`);
  }

  for (const field of fields) {
    const value = answers[field.key];
    if (value === undefined || value === null || value === "") {
      if (field.required) throw new InvalidFormAnswerError(`${field.label} is required`);
      continue;
    }
    validateFieldValue(field, value);
  }
}

function validateFieldValue(field: FormFieldRecord, value: unknown): void {
  switch (field.type) {
    case "TEXT":
    case "LONG_TEXT":
    case "EMAIL":
      if (typeof value !== "string" || (field.type === "EMAIL" && !/^\S+@\S+\.\S+$/.test(value))) {
        throw new InvalidFormAnswerError(`${field.label} has an invalid value`);
      }
      return;
    case "NUMBER": {
      if (typeof value !== "number" || !Number.isFinite(value)) throw new InvalidFormAnswerError(`${field.label} must be a number`);
      const validation = field.validation;
      if (validation?.min !== undefined && value < validation.min) throw new InvalidFormAnswerError(`${field.label} is below the minimum`);
      if (validation?.max !== undefined && value > validation.max) throw new InvalidFormAnswerError(`${field.label} is above the maximum`);
      return;
    }
    case "DROPDOWN":
    case "RADIO":
      if (typeof value !== "string" || !field.options.includes(value)) throw new InvalidFormAnswerError(`${field.label} has an invalid option`);
      return;
    case "CHECKBOX":
      if (typeof value !== "boolean") throw new InvalidFormAnswerError(`${field.label} must be true or false`);
      return;
    case "DATE":
      if (typeof value !== "string" || Number.isNaN(Date.parse(value))) throw new InvalidFormAnswerError(`${field.label} must be a valid date`);
      return;
  }
}


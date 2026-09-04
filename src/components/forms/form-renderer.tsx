"use client";

import type { FormFieldRecord } from "@/modules/forms";
import { Input, Label } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function FormRenderer({ fields, answers, onChange, readOnly = false }: { fields: readonly FormFieldRecord[]; answers: Record<string, unknown>; onChange?: (key: string, value: unknown) => void; readOnly?: boolean }) {
  return (
    <div className="space-y-4">
      {fields.map((field) => {
        const value = answers[field.key];
        const common = { disabled: readOnly, required: field.required };
        return (
          <div key={field.key}>
            <Label htmlFor={`field-${field.key}`}>{field.label}{field.required ? " *" : ""}</Label>
            {field.description && <p className="mb-1 text-xs text-(--color-text-secondary)">{field.description}</p>}
            {field.type === "LONG_TEXT" ? (
              <Textarea id={`field-${field.key}`} rows={4} value={String(value ?? "")} {...common} onChange={(event) => onChange?.(field.key, event.target.value)} />
            ) : field.type === "DROPDOWN" ? (
              <select id={`field-${field.key}`} className="w-full rounded-md border border-(--color-border) bg-(--color-background) px-4 py-2.5 text-sm" value={String(value ?? "")} {...common} onChange={(event) => onChange?.(field.key, event.target.value)}>
                <option value="">Select an option</option>
                {field.options.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            ) : field.type === "RADIO" ? (
              <div className="space-y-2">
                {field.options.map((option) => <label key={option} className="flex items-center gap-2 text-sm"><input type="radio" name={field.key} value={option} checked={value === option} {...common} onChange={() => onChange?.(field.key, option)} />{option}</label>)}
              </div>
            ) : field.type === "CHECKBOX" ? (
              <label className="flex items-center gap-2 text-sm"><input id={`field-${field.key}`} type="checkbox" checked={value === true} {...common} onChange={(event) => onChange?.(field.key, event.target.checked)} />Yes</label>
            ) : (
              <Input id={`field-${field.key}`} type={field.type === "NUMBER" ? "number" : field.type === "EMAIL" ? "email" : field.type === "DATE" ? "date" : "text"} value={String(value ?? "")} {...common} onChange={(event) => onChange?.(field.key, field.type === "NUMBER" ? (event.target.value === "" ? "" : Number(event.target.value)) : event.target.value)} />
            )}
          </div>
        );
      })}
    </div>
  );
}

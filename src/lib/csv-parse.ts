import { parse } from "csv-parse/sync";

/**
 * Generic, format-agnostic CSV parsing — the sibling to `toCsv` in
 * `src/lib/csv.ts` (that one serializes, this one parses). Returns one
 * object per data row, keyed by the header row's column names — callers
 * map those raw string fields into their own typed shape and validate them
 * (e.g. the bulk student import job handler maps into
 * `CreateStudentRequestSchema`). This function has no use-case-specific
 * knowledge of what a "row" means.
 */
export function parseCsv(text: string): Record<string, string>[] {
  return parse(text, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as Record<string, string>[];
}

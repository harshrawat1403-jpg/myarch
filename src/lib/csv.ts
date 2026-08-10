/**
 * Generic, format-agnostic CSV serialization — the only thing exports'
 * route handlers need to turn a DTO array into a response body. Use cases
 * never call this: they return plain DTOs, and a route handler decides how
 * to serialize them (docs' Day 10 "CSV → XLSX → PDF without modifying use
 * cases" requirement). Adding XLSX later means writing a sibling
 * `toXlsx(rows, columns)` using the same `ExportColumn<T>` shape and
 * pointing a route handler at it — no use case, DTO, or repository changes
 * required either way.
 */
export interface ExportColumn<T> {
  readonly header: string;
  readonly value: (row: T) => string;
}

/**
 * OWASP CSV/formula-injection mitigation: a value opened by Excel, Sheets,
 * or LibreOffice is interpreted as a formula if its first character is one
 * of these — regardless of the exporting field's own meaning — so any
 * user-controlled value (a student's bio, a company name, …) reaching an
 * export must never reach the spreadsheet with one of these characters
 * leading. Prefixing with a single quote is the standard neutralizer:
 * spreadsheet software renders the value as literal text (the leading
 * quote itself isn't shown), and the character still round-trips correctly
 * through this module's own comma/quote/newline escaping below. Exported
 * so `xlsx.ts` — the only other writer built on `ExportColumn<T>` — applies
 * the exact same rule rather than a second, possibly-drifting copy of it.
 */
const FORMULA_TRIGGER_CHARS = new Set(["=", "+", "-", "@"]);

export function neutralizeFormulaInjection(value: string): string {
  return value.length > 0 && FORMULA_TRIGGER_CHARS.has(value[0]!) ? `'${value}` : value;
}

/** RFC 4180-ish: quote a field only when it contains a comma, quote, or newline; double up embedded quotes. */
function escapeCsvField(value: string): string {
  const safeValue = neutralizeFormulaInjection(value);
  if (/[",\r\n]/.test(safeValue)) {
    return `"${safeValue.replace(/"/g, '""')}"`;
  }
  return safeValue;
}

export function toCsv<T>(rows: readonly T[], columns: readonly ExportColumn<T>[]): string {
  const headerLine = columns.map((column) => escapeCsvField(column.header)).join(",");
  const dataLines = rows.map((row) =>
    columns.map((column) => escapeCsvField(column.value(row))).join(","),
  );
  // CRLF line endings — the conventional CSV wire format, and what most
  // spreadsheet software expects when opening a downloaded .csv file.
  return [headerLine, ...dataLines].map((line) => `${line}\r\n`).join("");
}

/** Joins a multi-value field (skills, software, certifications, …) for a single CSV cell. */
export function joinForCsv(values: readonly string[]): string {
  return values.join("; ");
}

/**
 * `<prefix>-YYYY-MM-DD.csv` — used by every export route handler so the
 * filename convention lives in one place and is directly unit-testable,
 * rather than each handler formatting its own date string inline.
 */
export function buildCsvFilename(prefix: string, date: Date = new Date()): string {
  return `${prefix}-${date.toISOString().slice(0, 10)}.csv`;
}

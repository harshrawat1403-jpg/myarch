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

/** RFC 4180-ish: quote a field only when it contains a comma, quote, or newline; double up embedded quotes. */
function escapeCsvField(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function toCsv<T>(rows: readonly T[], columns: readonly ExportColumn<T>[]): string {
  const headerLine = columns.map((column) => escapeCsvField(column.header)).join(",");
  const dataLines = rows.map((row) => columns.map((column) => escapeCsvField(column.value(row))).join(","));
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

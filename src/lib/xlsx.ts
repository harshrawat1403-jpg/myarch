import ExcelJS from "exceljs";
import type { ExportColumn } from "./csv";

/**
 * V4.0 E7 (PRD §16 — "New format support: XLSX... e.g. exceljs"). Sibling to
 * `toCsv`, same `ExportColumn<T>` shape (per csv.ts's own doc comment
 * anticipating exactly this) — no use case, DTO, or repository changes
 * required to add this format to any existing or new export.
 */
export async function toXlsx<T>(rows: readonly T[], columns: readonly ExportColumn<T>[], sheetName = "Report"): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName.slice(0, 31)); // Excel's own 31-char sheet-name limit

  sheet.columns = columns.map((column) => ({ header: column.header, key: column.header }));
  sheet.getRow(1).font = { bold: true };

  for (const row of rows) {
    sheet.addRow(Object.fromEntries(columns.map((column) => [column.header, column.value(row)])));
  }

  sheet.columns.forEach((col) => {
    col.width = Math.min(40, Math.max(12, (col.header?.length ?? 12) + 4));
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export function buildXlsxFilename(prefix: string, date: Date = new Date()): string {
  return `${prefix}-${date.toISOString().slice(0, 10)}.xlsx`;
}

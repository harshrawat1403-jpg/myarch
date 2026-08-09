import type { NextRequest } from "next/server";
import { buildCsvFilename, toCsv, type ExportColumn } from "@/lib/csv";
import { buildXlsxFilename, toXlsx } from "@/lib/xlsx";
import { badRequest } from "@/lib/http-errors";

/**
 * V4.0 E7 (PRD §16 — "New format support: XLSX"). Shared by all four
 * existing export route handlers (Student Directory, Batch Report, Public
 * Placement, Recruiter Directory) so the CSV/XLSX branching logic lives in
 * exactly one place — `?format=xlsx` is purely additive: omitting it (every
 * existing caller, including the frontend's current CSV-only buttons)
 * preserves today's exact CSV response, unchanged.
 */
export async function respondWithExport<T>(req: NextRequest, rows: readonly T[], columns: readonly ExportColumn<T>[], filePrefix: string, sheetName: string) {
  const format = req.nextUrl.searchParams.get("format") ?? "csv";

  if (format === "xlsx") {
    const buffer = await toXlsx(rows, columns, sheetName);
    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${buildXlsxFilename(filePrefix)}"`,
      },
    });
  }

  if (format !== "csv") {
    return badRequest(`Unsupported export format: ${format}`);
  }

  const csv = toCsv(rows, columns);
  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${buildCsvFilename(filePrefix)}"`,
    },
  });
}

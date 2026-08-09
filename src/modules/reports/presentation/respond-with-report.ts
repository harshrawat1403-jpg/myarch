import { NextResponse } from "next/server";
import { buildCsvFilename, toCsv, type ExportColumn } from "@/lib/csv";
import { buildXlsxFilename, toXlsx } from "@/lib/xlsx";

export interface RespondWithReportOptions<T> {
  readonly filePrefix: string;
  readonly sheetName: string;
  /** Lazy — only the branch actually needed is computed (avoids building a PPTX buffer when the caller asked for CSV, and vice versa). */
  readonly csvXlsx: () => { rows: readonly T[]; columns: readonly ExportColumn<T>[] };
  readonly pptx?: () => Promise<Buffer>;
}

/**
 * V4.0 E7 — the report-export sibling of exports/presentation/respond-with-export.ts,
 * extended with a `pptx` branch (the new format that module doesn't need,
 * since none of its four directory-style CSV exports are "presentation-ready"
 * summaries — see this milestone's completion report for that scope
 * boundary). Shared by every new report route handler.
 */
export async function respondWithReport<T>(format: "csv" | "xlsx" | "pptx", options: RespondWithReportOptions<T>) {
  if (format === "pptx") {
    if (!options.pptx) return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "PPTX is not available for this report" } }, { status: 400 });
    const buffer = await options.pptx();
    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "Content-Disposition": `attachment; filename="${options.filePrefix}-${new Date().toISOString().slice(0, 10)}.pptx"`,
      },
    });
  }

  const { rows, columns } = options.csvXlsx();

  if (format === "xlsx") {
    const buffer = await toXlsx(rows, columns, options.sheetName);
    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${buildXlsxFilename(options.filePrefix)}"`,
      },
    });
  }

  const csv = toCsv(rows, columns);
  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${buildCsvFilename(options.filePrefix)}"`,
    },
  });
}

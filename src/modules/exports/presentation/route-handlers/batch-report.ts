import { withAuth } from "@/modules/auth";
import { forbidden } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { buildCsvFilename, toCsv } from "@/lib/csv";
import { generateBatchReportExportUseCase } from "../../infrastructure/container";
import { BATCH_REPORT_COLUMNS as COLUMNS } from "../columns";

export const exportBatchReportRouteHandler = withAuth(
  async (_req, { actor }) => {
    try {
      const rows = await generateBatchReportExportUseCase.execute({ actor });
      const csv = toCsv(rows, COLUMNS);
      const filename = buildCsvFilename("batch-report");

      return new Response(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    } catch (err) {
      if (err instanceof NotAuthorizedError) return forbidden(err.message);
      throw err;
    }
  },
  { roles: ["SECRETARY", "COORDINATOR"] },
);

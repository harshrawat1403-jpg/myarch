import { withAuth } from "@/modules/auth";
import { forbidden } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { generateBatchReportExportUseCase } from "../../infrastructure/container";
import { BATCH_REPORT_COLUMNS as COLUMNS } from "../columns";
import { respondWithExport } from "../respond-with-export";

export const exportBatchReportRouteHandler = withAuth(
  async (req, { actor }) => {
    try {
      const rows = await generateBatchReportExportUseCase.execute({ actor });
      return respondWithExport(req, rows, COLUMNS, "batch-report", "Batch Report");
    } catch (err) {
      if (err instanceof NotAuthorizedError) return forbidden(err.message);
      throw err;
    }
  },
  { roles: ["SECRETARY", "COORDINATOR"] },
);

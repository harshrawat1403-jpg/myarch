import { withAuth } from "@/modules/auth";
import { forbidden } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { buildCsvFilename, toCsv } from "@/lib/csv";
import { generateStudentDirectoryExportUseCase } from "../../infrastructure/container";
import { STUDENT_DIRECTORY_COLUMNS as COLUMNS } from "../columns";

export const exportStudentDirectoryRouteHandler = withAuth(
  async (_req, { actor }) => {
    try {
      const rows = await generateStudentDirectoryExportUseCase.execute({ actor });
      const csv = toCsv(rows, COLUMNS);
      const filename = buildCsvFilename("student-directory");

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

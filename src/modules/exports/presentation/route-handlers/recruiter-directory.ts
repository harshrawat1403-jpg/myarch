import { withAuth } from "@/modules/auth";
import { forbidden } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { buildCsvFilename, toCsv } from "@/lib/csv";
import { generateRecruiterDirectoryExportUseCase } from "../../infrastructure/container";
import { RECRUITER_DIRECTORY_COLUMNS as COLUMNS } from "../columns";

export const exportRecruiterDirectoryRouteHandler = withAuth(
  async (_req, { actor }) => {
    try {
      const rows = await generateRecruiterDirectoryExportUseCase.execute({ actor });
      const csv = toCsv(rows, COLUMNS);
      const filename = buildCsvFilename("recruiter-directory");

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
  // Secretary-only — see GenerateRecruiterDirectoryExportUseCase's doc comment.
  { roles: ["SECRETARY"] },
);

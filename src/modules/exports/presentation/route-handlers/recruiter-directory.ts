import { withAuth } from "@/modules/auth";
import { forbidden } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { generateRecruiterDirectoryExportUseCase } from "../../infrastructure/container";
import { RECRUITER_DIRECTORY_COLUMNS as COLUMNS } from "../columns";
import { respondWithExport } from "../respond-with-export";

export const exportRecruiterDirectoryRouteHandler = withAuth(
  async (req, { actor }) => {
    try {
      const rows = await generateRecruiterDirectoryExportUseCase.execute({ actor });
      return respondWithExport(req, rows, COLUMNS, "recruiter-directory", "Recruiter Directory");
    } catch (err) {
      if (err instanceof NotAuthorizedError) return forbidden(err.message);
      throw err;
    }
  },
  // Secretary-only — see GenerateRecruiterDirectoryExportUseCase's doc comment.
  { roles: ["SECRETARY"] },
);

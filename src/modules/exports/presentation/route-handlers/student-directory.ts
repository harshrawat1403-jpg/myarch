import { withAuth } from "@/modules/auth";
import { forbidden } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { generateStudentDirectoryExportUseCase } from "../../infrastructure/container";
import { STUDENT_DIRECTORY_COLUMNS as COLUMNS } from "../columns";
import { respondWithExport } from "../respond-with-export";

export const exportStudentDirectoryRouteHandler = withAuth(
  async (req, { actor }) => {
    try {
      const rows = await generateStudentDirectoryExportUseCase.execute({ actor });
      return respondWithExport(req, rows, COLUMNS, "student-directory", "Student Directory");
    } catch (err) {
      if (err instanceof NotAuthorizedError) return forbidden(err.message);
      throw err;
    }
  },
  { roles: ["SECRETARY", "COORDINATOR"] },
);

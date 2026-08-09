import { withAuth } from "@/modules/auth";
import { forbidden } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { generatePublicPlacementExportUseCase } from "../../infrastructure/container";
import { PUBLIC_PLACEMENT_COLUMNS as COLUMNS } from "../columns";
import { respondWithExport } from "../respond-with-export";

export const exportPublicPlacementRouteHandler = withAuth(
  async (req, { actor }) => {
    try {
      const rows = await generatePublicPlacementExportUseCase.execute({ actor });
      return respondWithExport(req, rows, COLUMNS, "public-placement-dataset", "Public Placement Dataset");
    } catch (err) {
      if (err instanceof NotAuthorizedError) return forbidden(err.message);
      throw err;
    }
  },
  { roles: ["SECRETARY", "COORDINATOR"] },
);

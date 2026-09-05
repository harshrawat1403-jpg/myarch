import {
  createCoreCommitteeSelectionRouteHandler,
  listCoreCommitteeSelectionsRouteHandler,
} from "@/modules/selections";
export const GET = listCoreCommitteeSelectionsRouteHandler;
export const POST = createCoreCommitteeSelectionRouteHandler;

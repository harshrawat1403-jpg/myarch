import {
  cancelCoreCommitteeSelectionInterviewRouteHandler,
  rescheduleCoreCommitteeSelectionInterviewRouteHandler,
} from "@/modules/selections";

export const PATCH = rescheduleCoreCommitteeSelectionInterviewRouteHandler;
export const DELETE = cancelCoreCommitteeSelectionInterviewRouteHandler;

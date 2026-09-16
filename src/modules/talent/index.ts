export {
  getOwnTalentDocumentRouteHandler,
  getOwnTalentProfileRouteHandler,
  getPublishedTalentProfileRouteHandler,
  saveOwnTalentProfileRouteHandler,
  setTalentFeaturedRouteHandler,
  uploadTalentDocumentRouteHandler,
} from "./server/route-handlers";
export { calculateTalentProfileCompleteness } from "./server/profile-completeness";
export type { TalentCompletenessInput, TalentProfileCompleteness } from "./server/profile-completeness";
export { TalentProfileInputSchema } from "./server/validation";

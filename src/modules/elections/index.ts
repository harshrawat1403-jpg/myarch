export type { ElectionRecord, CandidateRecord } from "./domain/entities";
export { ElectionError } from "./domain/election";
export { associateElectionCandidate } from "./infrastructure/associate-candidate";
export * from "./presentation/route-handlers";

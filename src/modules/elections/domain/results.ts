import { Prisma } from "@prisma/client";

export type ResultVoterGroup = "STUDENT" | "FACULTY" | "EX_COUNCIL";
export type PositionOutcome =
  | "WINNER_PENDING_VERIFICATION"
  | "QUORUM_FAILED"
  | "NOTA_WON"
  | "RUNOFF_REQUIRED";

const SCALE = 18;
const zero = new Prisma.Decimal(0);
const oneHundred = new Prisma.Decimal(100);

export type CountGroup = {
  voterGroup: ResultVoterGroup;
  eligibleCount: number;
  participationCount: number;
  abstentionCount: number;
  notaVoteCount: number;
  quorumPercent: Prisma.Decimal;
  configuredWeight: Prisma.Decimal;
  candidateVotes: ReadonlyMap<string, number>;
};
export type CountCandidate = { id: string; name: string };

export type ComputedGroup = Omit<CountGroup, "candidateVotes"> & {
  scoringDenominator: number;
  quorumMet: boolean;
  notaNormalizedScore: Prisma.Decimal;
};
export type ComputedCandidate = {
  id: string;
  name: string;
  rawRank: number;
  finalScore: Prisma.Decimal;
  isProvisionalWinner: boolean;
  groups: { voterGroup: ResultVoterGroup; rawVoteCount: number; normalizedScore: Prisma.Decimal }[];
};

export type ComputedPositionResult = {
  status: PositionOutcome;
  notaFinalScore: Prisma.Decimal;
  groups: ComputedGroup[];
  candidates: ComputedCandidate[];
};

function decimal(value: number | Prisma.Decimal): Prisma.Decimal {
  return new Prisma.Decimal(value).toDecimalPlaces(SCALE, Prisma.Decimal.ROUND_HALF_UP);
}
function score(votes: number, denominator: number): Prisma.Decimal {
  return denominator === 0 ? zero : decimal(new Prisma.Decimal(votes).div(denominator));
}

/**
 * Computes the Council-only normalized score without JavaScript Number
 * arithmetic. Scores are rounded once to 18 fixed decimal places, then that
 * authoritative value is used for both persistence and tie comparisons.
 */
export function computePositionResult(
  candidates: readonly CountCandidate[],
  groups: readonly CountGroup[],
): ComputedPositionResult {
  const calculatedGroups = groups.map<ComputedGroup>((group) => {
    const candidateVotes = candidates.reduce(
      (total, candidate) => total + (group.candidateVotes.get(candidate.id) ?? 0),
      0,
    );
    const scoringDenominator = candidateVotes + group.notaVoteCount;
    const turnout = group.eligibleCount === 0
      ? zero
      : decimal(new Prisma.Decimal(group.participationCount).mul(oneHundred).div(group.eligibleCount));
    return {
      ...group,
      scoringDenominator,
      quorumMet: group.quorumPercent.equals(zero) || turnout.greaterThanOrEqualTo(group.quorumPercent),
      notaNormalizedScore: score(group.notaVoteCount, scoringDenominator),
    };
  });
  const weighted = (group: ComputedGroup, value: Prisma.Decimal) =>
    decimal(value.mul(group.configuredWeight).div(oneHundred));
  const notaFinalScore = calculatedGroups.reduce(
    (total, group) => decimal(total.plus(weighted(group, group.notaNormalizedScore))),
    zero,
  );
  const computed = candidates.map((candidate) => {
    const candidateGroups = calculatedGroups.map((group) => {
      const rawVoteCount = groups.find((entry) => entry.voterGroup === group.voterGroup)!.candidateVotes.get(candidate.id) ?? 0;
      return { voterGroup: group.voterGroup, rawVoteCount, normalizedScore: score(rawVoteCount, group.scoringDenominator) };
    });
    const finalScore = candidateGroups.reduce(
      (total, candidateGroup) => {
        const group = calculatedGroups.find((entry) => entry.voterGroup === candidateGroup.voterGroup)!;
        return decimal(total.plus(weighted(group, candidateGroup.normalizedScore)));
      },
      zero,
    );
    return { id: candidate.id, name: candidate.name, finalScore, groups: candidateGroups };
  });
  const ranked = [...computed].sort((left, right) => right.finalScore.comparedTo(left.finalScore));
  let previous: Prisma.Decimal | null = null;
  let rank = 0;
  const withRanks = ranked.map((candidate, index) => {
    if (!previous || !candidate.finalScore.equals(previous)) rank = index + 1;
    previous = candidate.finalScore;
    return { ...candidate, rawRank: rank };
  });
  const topCandidates = withRanks.filter((candidate) => candidate.rawRank === 1);
  const quorumFailed = calculatedGroups.some((group) => !group.quorumMet);
  const notaIsTop = topCandidates.length === 0 || notaFinalScore.greaterThan(topCandidates[0]!.finalScore);
  const tiedWithNota = topCandidates.some((candidate) => candidate.finalScore.equals(notaFinalScore));
  const status: PositionOutcome = quorumFailed
    ? "QUORUM_FAILED"
    : notaIsTop
      ? "NOTA_WON"
      : tiedWithNota || topCandidates.length > 1
        ? "RUNOFF_REQUIRED"
        : "WINNER_PENDING_VERIFICATION";
  const winnerId = status === "WINNER_PENDING_VERIFICATION" ? topCandidates[0]!.id : null;
  return {
    status,
    notaFinalScore,
    groups: calculatedGroups,
    candidates: withRanks.map((candidate) => ({
      ...candidate,
      isProvisionalWinner: candidate.id === winnerId,
    })),
  };
}

export interface TalentCompletenessInput {
  readonly hasPhoto: boolean;
  readonly professionalHeadline: string | null;
  readonly bio: string | null;
  readonly skillCount: number;
  readonly softwareCount: number;
  readonly projectCount: number;
  readonly hasResume: boolean;
  readonly hasPortfolio: boolean;
  readonly linkedInUrl: string | null;
}

export interface TalentProfileCompleteness {
  readonly percentage: number;
  readonly missingRecommendedItems: readonly string[];
}

const CHECKS: ReadonlyArray<{ key: string; present: (profile: TalentCompletenessInput) => boolean }> = [
  { key: "photo", present: (profile) => profile.hasPhoto },
  { key: "professional headline", present: (profile) => Boolean(profile.professionalHeadline?.trim()) },
  { key: "bio", present: (profile) => Boolean(profile.bio?.trim()) },
  { key: "skills", present: (profile) => profile.skillCount > 0 },
  { key: "software", present: (profile) => profile.softwareCount > 0 },
  { key: "project", present: (profile) => profile.projectCount > 0 },
  { key: "resume", present: (profile) => profile.hasResume },
  { key: "portfolio", present: (profile) => profile.hasPortfolio },
  { key: "LinkedIn", present: (profile) => Boolean(profile.linkedInUrl?.trim()) },
];

export function calculateTalentProfileCompleteness(profile: TalentCompletenessInput): TalentProfileCompleteness {
  const missingRecommendedItems = CHECKS.filter((check) => !check.present(profile)).map((check) => check.key);
  return {
    percentage: Math.round(((CHECKS.length - missingRecommendedItems.length) / CHECKS.length) * 100),
    missingRecommendedItems,
  };
}

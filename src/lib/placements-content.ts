/**
 * Static content for the public marketing site's Placements page
 * (Milestone 4). `PLACEMENT_STATS` and `RECRUITING_CATEGORIES` are
 * deliberately imported from `public-content.ts` rather than redeclared —
 * Home and Placements must show the same illustrative figures and the same
 * recruiter categories, not two independently-invented sets of numbers.
 * Everything else here is process description (how the workflow runs),
 * not a factual claim about the department, so it carries no illustrative
 * caveat the way the numeric stats do.
 *
 * Version 2.0 (editorial pass): copy trimmed throughout; `PLACEMENTS_HERO`
 * and `PLACEMENTS_CTA` added (previously inline JSX text) so nothing on
 * this page is hardcoded into the component. `SUCCESS_STORIES` and
 * `RECRUITER_LOGO_COUNT` are new — explicit editable-image placeholders,
 * never fabricated names, quotes, or company logos.
 */

export const PLACEMENTS_HERO = {
  eyebrow: "Placements",
  title: "A placement process built around design portfolios.",
  subhead:
    "Connecting graduating students with recruiters, from the first pre-placement talk through to offer.",
  imageLabel: "Placements Hero Image",
};

export interface ProcessStepContent {
  title: string;
  description: string;
}

export const PLACEMENT_PROCESS_STEPS: ProcessStepContent[] = [
  {
    title: "Pre-Placement Talk",
    description:
      "Recruiters are invited to present their practice and the roles they're hiring for, before students register interest.",
  },
  {
    title: "Registration & Eligibility",
    description:
      "Interested students register against the roles they're eligible for, based on programme and academic standing.",
  },
  {
    title: "Assessment",
    description:
      "Depending on the role, this may include a design/aptitude test, a portfolio review, or both.",
  },
  {
    title: "Interviews",
    description:
      "Shortlisted students are interviewed — typically a portfolio walkthrough followed by a discussion round.",
  },
  {
    title: "Offer & Onboarding",
    description:
      "Selected students receive an offer through the department, with onboarding details shared directly by the recruiter.",
  },
];

export const STUDENT_PREPARATION_STEPS: ProcessStepContent[] = [
  {
    title: "Portfolio Compilation",
    description:
      "Studio and thesis work is compiled into a presentable portfolio, reviewed with faculty before it's shared with recruiters.",
  },
  {
    title: "Mock Interviews",
    description:
      "Practice interviews and design-review sessions help students prepare for the format recruiters actually use.",
  },
  {
    title: "Software & Tool Readiness",
    description:
      "Students confirm working fluency in the software relevant to the roles they're registering for.",
  },
  {
    title: "Profile & Registration",
    description:
      "Students complete their MYARCH profile and register for the roles they're eligible for ahead of each drive.",
  },
];

export const RECRUITER_ENGAGEMENT_STEPS: ProcessStepContent[] = [
  {
    title: "Request Access",
    description:
      "Recruiters get in touch through the Contact page to request access and share the roles they're hiring for.",
  },
  {
    title: "Schedule a Drive",
    description:
      "The department schedules a pre-placement talk and the relevant assessment/interview slots.",
  },
  {
    title: "Review & Shortlist",
    description:
      "Recruiters review student profiles and portfolios through the recruiter directory to shortlist candidates.",
  },
  {
    title: "Interview & Offer",
    description:
      "Interviews are conducted on the agreed schedule, with offers extended through the department.",
  },
];

export const INTERNSHIP_OVERVIEW =
  "Most students complete at least one studio-aligned internship before their final year — an early, lower-commitment way for recruiters to work with student talent before a full-time hire.";
export const INTERNSHIP_IMAGE_LABEL = "Internship Image";

export interface SuccessStory {
  role: string;
  imageLabel: string;
}

/** Editable placeholders, not fabricated testimonials — no invented names, quotes, or outcomes until real ones are supplied. */
export const SUCCESS_STORIES: SuccessStory[] = [
  { role: "Add a success story", imageLabel: "Photo" },
  { role: "Add a success story", imageLabel: "Photo" },
  { role: "Add a success story", imageLabel: "Photo" },
];

/** How many editable recruiter-logo placeholder tiles to render — real logos replace these once recruiters are confirmed, never invented company names. */
export const RECRUITER_LOGO_COUNT = 6;

export interface FaqContentItem {
  question: string;
  answer: string;
}

// Named individually (rather than only as array literals) so other pages
// can reuse a specific, exact question rather than re-authoring a near-
// duplicate — e.g. the Recruiters page's FAQ pulls the recruiter-relevant
// subset of these by name instead of slicing this array by position.
export const FAQ_DIRECTORY_ACCESS: FaqContentItem = {
  question: "Who can access the student directory?",
  answer:
    "Only verified, signed-in recruiter accounts, provisioned by the department after a request through Contact — the directory isn't publicly browsable.",
};

export const FAQ_RECRUITING_COST: FaqContentItem = {
  question: "Is there a cost to recruit through MYARCH?",
  answer:
    "There's no platform fee. Any cost is limited to whatever a recruiter's own visit or interview process normally involves.",
};

export const FAQ_INTERNSHIP_ONLY: FaqContentItem = {
  question: "Can we hire for internships only?",
  answer: "Yes — internship-only roles follow the same request process as full-time roles.",
};

export const FAQ_SHORTLISTING: FaqContentItem = {
  question: "How are students shortlisted?",
  answer:
    "Recruiters review profiles and portfolios directly and shortlist candidates themselves; the department doesn't pre-filter beyond eligibility.",
};

export const FAQ_PUBLIC_PROFILE_INFO: FaqContentItem = {
  question: "What information is visible on a student's public profile?",
  answer:
    "Only what a student has submitted and had approved for their public profile — private academic records are never shared.",
};

export const FAQ_CONTACT_ROUTING: FaqContentItem = {
  question: "Who do we contact with questions?",
  answer:
    "The Contact page routes placement-related queries to the Training & Placement Cell directly.",
};

export const PLACEMENTS_FAQ: FaqContentItem[] = [
  FAQ_DIRECTORY_ACCESS,
  FAQ_RECRUITING_COST,
  FAQ_INTERNSHIP_ONLY,
  FAQ_SHORTLISTING,
  FAQ_PUBLIC_PROFILE_INFO,
  FAQ_CONTACT_ROUTING,
];

export const PLACEMENTS_CTA = {
  eyebrow: "Get Involved",
  title: "Ready to connect with the department?",
  description:
    "Recruiters can request access to the student directory. Students can sign in to manage their profile.",
  imageLabel: "Closing Image",
};

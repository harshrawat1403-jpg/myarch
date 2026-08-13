/**
 * Static content for the public marketing site's Home page (Milestone 2).
 *
 * Per V1_UI_SPECIFICATION.md's open questions #1 and #2: real marketing
 * copy is a content-side deliverable, and no public placement-statistics
 * endpoint exists yet (every stats endpoint requires auth; the backend is
 * frozen for this milestone). This file holds clearly interim/illustrative
 * data — structurally correct, generically worded, nothing asserted as a
 * verified fact about specific companies, students, or events — so the
 * page can ship now and be swapped for a real content/data source later
 * without a layout change (same interim-data pattern the spec's Milestone
 * 4 guidance describes for the Placements page).
 */

/**
 * The one general department contact address, used everywhere a public
 * page needs it (Footer, Contact) — a single source of truth rather than
 * the same placeholder string copy-pasted per call site.
 */
export const DEPARTMENT_EMAIL = "contact@tnparch.in";

/**
 * Version 2.0: every Home page prose string, previously inline JSX text,
 * moved here — "nothing hardcoded into React components" applies to
 * paragraphs and headings just as much as it does to lists of stats or
 * projects. Editing copy no longer touches `page.tsx` at all.
 */
export const HOME_HERO = {
  eyebrow: "Department of Architecture & Planning · VNIT Nagpur",
  headline: "Where design thinking becomes built practice.",
  subhead:
    "Connecting studio-trained architecture and planning students with recruiters who value the craft.",
  imageLabel: "Hero Image",
};

export const HOME_ABOUT = {
  paragraph:
    "Five years of studio-driven education across architecture and urban & regional planning.",
  visionLabel: "Vision",
  visionText:
    "Designers and planners who move confidently between a single building and a growing city.",
  imageLabel: "Department Image",
};

export const STATS_CAPTION = "Illustrative figures — verified statistics to follow.";

export const SHOWCASE_INTRO = "A sample of studio and thesis work from across the department.";
export const SHOWCASE_CAPTION = "Full portfolios are available to signed-in recruiters.";

export const HOME_CTA = {
  eyebrow: "Get Started",
  title: "Ready to get started?",
  description: "Sign in to manage your profile, or request recruiter access.",
  imageLabel: "Campus Image",
};

export interface StatItem {
  label: string;
  value: string;
  scope: string;
}

export const PLACEMENT_STATS: StatItem[] = [
  { label: "Placement Rate", value: "92%", scope: "Eligible students placed, latest batch" },
  { label: "Recruiting Partners", value: "45+", scope: "Organizations recruiting on campus" },
  { label: "Average Package", value: "6.2 LPA", scope: "Across all recruited roles" },
];

export const RECRUITING_CATEGORIES = [
  "Architecture & Design Studios",
  "Urban Planning Consultancies",
  "Real Estate & Infrastructure Firms",
  "Construction & Project Management Groups",
  "Government & Public Works Bodies",
  "Interior & Landscape Design Practices",
] as const;

export interface FeaturedProject {
  title: string;
  studio: string;
  description: string;
}

export const FEATURED_PROJECTS: FeaturedProject[] = [
  {
    title: "Urban Housing Studio — Design Thesis",
    studio: "B.Arch Thesis, Final Year",
    description:
      "A density study exploring incremental housing typologies for a mid-sized Indian city.",
  },
  {
    title: "Adaptive Reuse Studio",
    studio: "M.Plan Studio Project",
    description: "Reimagining a disused industrial site as a mixed-use public precinct.",
  },
  {
    title: "Regional Mobility Workshop",
    studio: "Urban & Regional Planning Studio",
    description: "A land-use and mobility framework proposed for a growing peri-urban corridor.",
  },
];

export interface FeatureItem {
  title: string;
  description: string;
  glyph: "design" | "software" | "studio" | "thinking";
}

export const WHY_RECRUIT_FEATURES: FeatureItem[] = [
  {
    title: "Rigorous Design Training",
    description: "Five years of studio-based architecture and planning education.",
    glyph: "design",
  },
  {
    title: "Software Fluency",
    description: "AutoCAD, Revit, SketchUp, and Rhino/Grasshopper built into the curriculum.",
    glyph: "software",
  },
  {
    title: "Studio Culture",
    description: "A critique-driven culture that builds iteration and design conviction.",
    glyph: "studio",
  },
  {
    title: "Design Thinking",
    description: "Problem-framing that scales from a building to a region.",
    glyph: "thinking",
  },
];

export interface UpdateItem {
  category: string;
  title: string;
  description: string;
}

export const LATEST_UPDATES: UpdateItem[] = [
  {
    category: "Placement",
    title: "Placement season opens for the upcoming academic year",
    description: "Recruiters can request access ahead of the on-campus drive.",
  },
  {
    category: "Event",
    title: "Annual studio exhibition",
    description: "Student work from every year is exhibited at the end-of-semester review.",
  },
  {
    category: "News",
    title: "Guest lectures and design workshops",
    description:
      "The department regularly hosts practicing architects and planners for student workshops.",
  },
];

export interface QuickAction {
  title: string;
  description: string;
  href: string;
}

export const QUICK_ACTIONS: QuickAction[] = [
  {
    title: "View Placements",
    description: "See placement outcomes and the recruitment process.",
    href: "/placements",
  },
  {
    title: "Recruit Students",
    description: "Learn how to partner with the department.",
    href: "/recruiters",
  },
  {
    title: "Student Login",
    description: "Access your profile and placement status.",
    href: "/login",
  },
  {
    title: "Recruiter Login",
    description: "Sign in to browse the student directory.",
    href: "/login",
  },
];

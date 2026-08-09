import type { PublicationBlock } from "./blocks";
import { DEFAULT_STYLE } from "./blocks";
import type { PublicationTemplateStructure, PublicationType } from "./entities";

/**
 * V4.0 E3 (§13.1) — the ten publication kinds, each a fixed structure
 * (never a freeform canvas). §5.1's `PublicationTemplate` model only defines
 * 7 storage `type` values; the ten named kinds map onto them here, with the
 * specific kind carried by `name` — e.g. "Placement Brochure" and
 * "Department Brochure" are both `type: BROCHURE`, distinguished by their
 * own structure below, not by a wider enum.
 *
 * Seeded once into `PublicationTemplate` rows by prisma/seed.ts — there is
 * no template-authoring UI in V4.0 (§13.1 starts the flow at "Choose
 * Template," implying templates pre-exist).
 */
export interface PublicationTemplateSeed {
  readonly key: string;
  readonly name: string;
  readonly type: PublicationType;
  readonly description: string;
  readonly structure: PublicationTemplateStructure;
}

function block<T extends PublicationBlock>(block: T): T {
  return block;
}

export const PUBLICATION_TEMPLATE_SEEDS: readonly PublicationTemplateSeed[] = [
  {
    key: "placement-brochure",
    name: "Placement Brochure",
    type: "BROCHURE",
    description: "Cover, intro, one page per selected graduating student, and a recruiting-partners page — the department's flagship placement-season document.",
    structure: {
      dataBinding: "STUDENTS",
      defaultStyle: DEFAULT_STYLE,
      insertDataBlocksAfterBlockId: "intro",
      baseBlocks: [
        block({ id: "cover", type: "COVER", visible: true, data: { title: "Placement Brochure", subtitle: "Graduating Class", imageFileId: null } }),
        block({ id: "intro", type: "TEXT", visible: true, data: { text: "Meet our graduating students, ready to bring their skills to your organization." } }),
        block({ id: "partners-heading", type: "HEADING", visible: true, data: { text: "Our Recruiting Partners", level: 2 } }),
        block({ id: "partners", type: "COMPANY_LOGO_GRID", visible: true, data: { companyIds: [] } }),
        block({ id: "back", type: "BACK_COVER", visible: true, data: { text: null } }),
      ],
    },
  },
  {
    key: "department-brochure",
    name: "Department Brochure",
    type: "BROCHURE",
    description: "A general department-overview brochure — cover, mission, programs, static content the Secretary edits directly, no per-student data binding.",
    structure: {
      dataBinding: "NONE",
      defaultStyle: DEFAULT_STYLE,
      insertDataBlocksAfterBlockId: null,
      baseBlocks: [
        block({ id: "cover", type: "COVER", visible: true, data: { title: "Department Brochure", subtitle: null, imageFileId: null } }),
        block({ id: "about-heading", type: "HEADING", visible: true, data: { text: "About the Department", level: 2 } }),
        block({ id: "about", type: "TEXT", visible: true, data: { text: "Describe the department's mission, programs, and highlights here." } }),
        block({ id: "divider", type: "DIVIDER", visible: true, data: {} }),
        block({ id: "back", type: "BACK_COVER", visible: true, data: { text: null } }),
      ],
    },
  },
  {
    key: "recruiter-booklet",
    name: "Recruiter Booklet",
    type: "BOOKLET",
    description: "Cover, intro, and a recruiting-partners page listing selected companies — shared with prospective recruiters.",
    structure: {
      dataBinding: "COMPANIES",
      defaultStyle: DEFAULT_STYLE,
      insertDataBlocksAfterBlockId: "intro",
      baseBlocks: [
        block({ id: "cover", type: "COVER", visible: true, data: { title: "Recruiter Booklet", subtitle: null, imageFileId: null } }),
        block({ id: "intro", type: "TEXT", visible: true, data: { text: "The companies below have engaged with our department this placement season." } }),
        block({ id: "back", type: "BACK_COVER", visible: true, data: { text: null } }),
      ],
    },
  },
  {
    key: "student-portfolio-book",
    name: "Student Portfolio Book",
    type: "PORTFOLIO_BOOK",
    description: "A dedicated page per selected student showcasing bio, skills, software, and portfolio links in depth.",
    structure: {
      dataBinding: "STUDENTS",
      defaultStyle: DEFAULT_STYLE,
      insertDataBlocksAfterBlockId: "intro",
      baseBlocks: [
        block({ id: "cover", type: "COVER", visible: true, data: { title: "Student Portfolio Book", subtitle: null, imageFileId: null } }),
        block({ id: "intro", type: "TEXT", visible: true, data: { text: "A closer look at the work and profiles of our featured students." } }),
        block({ id: "back", type: "BACK_COVER", visible: true, data: { text: null } }),
      ],
    },
  },
  {
    key: "internship-publication",
    name: "Internship Publication",
    type: "BOOKLET",
    description: "Highlights selected students' internship journeys — cover, intro, one page per student.",
    structure: {
      dataBinding: "STUDENTS",
      defaultStyle: DEFAULT_STYLE,
      insertDataBlocksAfterBlockId: "intro",
      baseBlocks: [
        block({ id: "cover", type: "COVER", visible: true, data: { title: "Internship Publication", subtitle: null, imageFileId: null } }),
        block({ id: "intro", type: "TEXT", visible: true, data: { text: "Celebrating the internship journeys of our students this year." } }),
        block({ id: "back", type: "BACK_COVER", visible: true, data: { text: null } }),
      ],
    },
  },
  {
    key: "alumni-publication",
    name: "Alumni Publication",
    type: "BOOKLET",
    description: "Cover, intro, and a page per selected alumni — where they are now, sourced from real AlumniProfile records.",
    structure: {
      dataBinding: "ALUMNI",
      defaultStyle: DEFAULT_STYLE,
      insertDataBlocksAfterBlockId: "intro",
      baseBlocks: [
        block({ id: "cover", type: "COVER", visible: true, data: { title: "Alumni Publication", subtitle: null, imageFileId: null } }),
        block({ id: "intro", type: "TEXT", visible: true, data: { text: "Catching up with our alumni — where they've gone and what they're doing now." } }),
        block({ id: "back", type: "BACK_COVER", visible: true, data: { text: null } }),
      ],
    },
  },
  {
    key: "annual-report",
    name: "Annual Report",
    type: "ANNUAL_REPORT",
    description: "Cover and a real, live-computed placement-cycle statistics summary — never a fabricated or hand-typed number.",
    structure: {
      dataBinding: "STATS",
      defaultStyle: DEFAULT_STYLE,
      insertDataBlocksAfterBlockId: "intro",
      baseBlocks: [
        block({ id: "cover", type: "COVER", visible: true, data: { title: "Annual Placement Report", subtitle: null, imageFileId: null } }),
        block({ id: "intro", type: "TEXT", visible: true, data: { text: "A summary of this placement cycle's real, department-wide activity." } }),
        block({ id: "back", type: "BACK_COVER", visible: true, data: { text: null } }),
      ],
    },
  },
  {
    key: "event-booklet",
    name: "Event Booklet",
    type: "BOOKLET",
    description: "A static booklet for a department event — cover, agenda, details, no data binding.",
    structure: {
      dataBinding: "NONE",
      defaultStyle: DEFAULT_STYLE,
      insertDataBlocksAfterBlockId: null,
      baseBlocks: [
        block({ id: "cover", type: "COVER", visible: true, data: { title: "Event Booklet", subtitle: null, imageFileId: null } }),
        block({ id: "agenda-heading", type: "HEADING", visible: true, data: { text: "Agenda", level: 2 } }),
        block({ id: "agenda", type: "TEXT", visible: true, data: { text: "Describe the event schedule here." } }),
        block({ id: "back", type: "BACK_COVER", visible: true, data: { text: null } }),
      ],
    },
  },
  {
    key: "newsletter",
    name: "Newsletter",
    type: "NEWSLETTER",
    description: "A static, editable newsletter — cover and article sections the Secretary/Coordinator fills in directly.",
    structure: {
      dataBinding: "NONE",
      defaultStyle: DEFAULT_STYLE,
      insertDataBlocksAfterBlockId: null,
      baseBlocks: [
        block({ id: "cover", type: "COVER", visible: true, data: { title: "Department Newsletter", subtitle: null, imageFileId: null } }),
        block({ id: "article-heading", type: "HEADING", visible: true, data: { text: "This Issue", level: 2 } }),
        block({ id: "article", type: "TEXT", visible: true, data: { text: "Write this issue's updates here." } }),
        block({ id: "back", type: "BACK_COVER", visible: true, data: { text: null } }),
      ],
    },
  },
  {
    key: "custom-publication",
    name: "Custom Publication",
    type: "CUSTOM",
    description: "A blank starting point — cover and back cover only, fully built up block by block.",
    structure: {
      dataBinding: "NONE",
      defaultStyle: DEFAULT_STYLE,
      insertDataBlocksAfterBlockId: null,
      baseBlocks: [
        block({ id: "cover", type: "COVER", visible: true, data: { title: "Untitled Publication", subtitle: null, imageFileId: null } }),
        block({ id: "back", type: "BACK_COVER", visible: true, data: { text: null } }),
      ],
    },
  },
];

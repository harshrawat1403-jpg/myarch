/**
 * Static content for the public marketing site's About page (Milestone 3).
 * Same rationale as `public-content.ts`: real institutional copy (exact
 * founding dates, named faculty, specific facility inventories) is a
 * content-side deliverable outside this milestone's scope, and no backend
 * source exists for any of it. Nothing below asserts a specific
 * unverifiable fact (a year, a headcount, a named person) — it's
 * structurally accurate, generically worded, and easy to swap for real
 * copy without a layout change, same as Home's interim content.
 *
 * Version 2.0 (editorial pass): copy trimmed throughout — this page leans
 * on imagery and layout to carry the story, not paragraph count.
 * `glyph` fields (the V1.1 hand-drawn line-icon set) were dropped from
 * `StudioCultureTrait` and `WhyVnitReason` — About no longer renders them,
 * following Home's move to numerals/Lucide icons for the same content
 * shape (see `page.tsx`'s doc comment).
 */

export const ABOUT_HERO = {
  eyebrow: "About · Department of Architecture & Planning",
  title: "A department built on studio practice.",
  subhead:
    "Studio-driven education in architecture and planning, at every scale from a single room to a growing city.",
  imageLabel: "About Hero Image",
};

export interface VisionMissionItem {
  label: string;
  body: string;
}

export const VISION_MISSION: VisionMissionItem[] = [
  {
    label: "Vision",
    body: "Designers and planners who move confidently between a single building and a growing city.",
  },
  {
    label: "Mission",
    body: "A rigorous, studio-based education that pairs design excellence with the readiness to practice responsibly at every scale.",
  },
];

export const HISTORY_PARAGRAPHS: string[] = [
  "The department began as a modest architecture program and has grown into a full department spanning architecture and urban & regional planning.",
  "That growth has been shaped by a consistent studio culture — testing ideas through drawing, model-making, and critique — carried forward into contemporary tools and a wider professional landscape.",
];

export const HISTORY_PULL_QUOTE = "A department that has grown with the discipline itself.";
export const HISTORY_IMAGE_LABEL = "History Image";

export const PHILOSOPHY_PARAGRAPH =
  "Studio is the spine of the curriculum, not an elective around it. Design problems are worked iteratively and defended in front of faculty and peers — technical and theoretical coursework runs alongside studio, in the context of a live design problem, not in isolation from one.";

export const PHILOSOPHY_PULL_LINE =
  "Design is taught as a way of reasoning, not a style to imitate.";

export interface StudioCultureTrait {
  title: string;
  description: string;
}

export const STUDIO_CULTURE_TRAITS: StudioCultureTrait[] = [
  {
    title: "Critique Culture",
    description:
      "Work is presented and defended in open review — critique as part of the process, not judgment after it.",
  },
  {
    title: "Iterative Process",
    description:
      "Ideas move through repeated cycles of sketch, model, and drawing before a design is resolved.",
  },
  {
    title: "Collaborative Making",
    description: "Studio spaces are shared and worked in together, not alone.",
  },
];

export const STUDIO_CULTURE_IMAGE_LABEL = "Studio Culture Image";

export interface Facility {
  title: string;
  description: string;
}

export const FACILITIES: Facility[] = [
  {
    title: "Design Studios",
    description: "Dedicated space for every cohort, worked in throughout the semester.",
  },
  {
    title: "Model-Making Workshop",
    description: "Tools and workspace for physical model-making, study to presentation.",
  },
  {
    title: "Computer & CAD Lab",
    description: "Workstations for drafting, 3D modelling, and visualization.",
  },
  {
    title: "Resource Library",
    description: "Reference material spanning the discipline, alongside past studio work.",
  },
];

export const FACULTY_PLACEHOLDER_MESSAGE =
  "A full faculty directory is being prepared. Department faculty can be reached through the Contact page in the meantime.";
export const FACULTY_IMAGE_LABEL = "Faculty Image";

export interface WhyVnitReason {
  title: string;
  description: string;
}

export const WHY_VNIT_REASONS: WhyVnitReason[] = [
  {
    title: "Design-First Curriculum",
    description: "Five years structured around studio practice, not a single elective among many.",
  },
  {
    title: "Hands-On Software Training",
    description:
      "Practical fluency in AutoCAD, Revit, SketchUp, and Rhino/Grasshopper, built into coursework.",
  },
  {
    title: "A Studio You Actually Work In",
    description: "Shared studio space and a critique culture that shapes how you think.",
  },
  {
    title: "Design Thinking, Applied Broadly",
    description:
      "Problem-framing that carries into urban and regional-scale work, not just buildings.",
  },
];

export const ABOUT_CTA = {
  eyebrow: "Continue Exploring",
  title: "See what our students go on to do.",
  description:
    "Explore placement outcomes, or meet the students currently building their portfolios.",
  imageLabel: "Closing Image",
};

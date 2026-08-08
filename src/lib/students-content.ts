import type { ProcessStep } from "@/components/public/process-steps";

/**
 * Static content for the public marketing site's Students page
 * (Milestone 5). Same rationale as the other public content files: no
 * fabricated specific facts (curriculum details are described structurally,
 * the way a standard 5-year B.Arch/planning programme runs, not asserted
 * as a verified fact about this exact programme's year-by-year syllabus),
 * no invented award winners, no invented specific software beyond the set
 * already established consistently on Home and About.
 *
 * Version 2.0 (editorial pass): the most image-led page on the site —
 * "the most emotional page," per the brief. `glyph` fields (hand-drawn
 * line icons) dropped from `StudioCultureItem`, same retirement as every
 * other page's pass; Studio Culture now leads with imagery instead.
 */

export const STUDENTS_HERO = {
  eyebrow: "Students",
  title: "Five years of studio, from first sketch to thesis.",
  subhead: "The skills, the software, and how a portfolio comes together.",
  imageLabel: "Replace Students Hero Image",
};

export const ACADEMIC_JOURNEY_STEPS: ProcessStep[] = [
  { title: "Foundation Year", description: "Core design fundamentals, drawing, and material studies shared across the first year." },
  { title: "Design Fundamentals", description: "Studio problems grow in scale and complexity, alongside structures and building science coursework." },
  { title: "Core Studio Practice", description: "The bulk of studio credits — building-scale design problems paired with technical and professional coursework." },
  { title: "Electives & Urban Studies", description: "Studio work extends to urban and regional scale, alongside electives in specialised design areas." },
  { title: "Thesis & Professional Practice", description: "An independent, faculty-guided thesis project, completed alongside professional practice coursework." },
];

export interface StudioCultureItem {
  title: string;
  description: string;
  imageLabel: string;
}

export const STUDIO_CULTURE_ITEMS: StudioCultureItem[] = [
  {
    title: "Studio Is Home Base",
    description: "Where design work actually happens, not just where it's assigned.",
    imageLabel: "Replace Studio Image",
  },
  {
    title: "Critique Is Public",
    description: "Work is pinned up and defended out loud, in front of the cohort.",
    imageLabel: "Replace Critique Session Image",
  },
  {
    title: "Nothing Survives First Draft",
    description: "Every project moves through repeated rounds of sketch, model, and redraw.",
    imageLabel: "Replace Model-Making Image",
  },
];

export interface SkillCategory {
  category: string;
  skills: string[];
}

export const SKILL_MATRIX: SkillCategory[] = [
  { category: "Design & Drafting", skills: ["Architectural drawing", "Site planning", "Detailing"] },
  { category: "Digital Modelling", skills: ["3D modelling", "Parametric design", "Visualization"] },
  { category: "Technical Documentation", skills: ["Working drawings", "Building services coordination", "Specifications"] },
  { category: "Communication", skills: ["Portfolio presentation", "Design juries", "Written design rationale"] },
];

export interface SoftwareToolItem {
  tool: string;
  description: string;
}

export const SOFTWARE_ECOSYSTEM: SoftwareToolItem[] = [
  { tool: "AutoCAD", description: "Technical drafting and working drawings." },
  { tool: "Revit", description: "BIM-based design and documentation." },
  { tool: "SketchUp", description: "Fast massing and concept modelling." },
  { tool: "Rhino / Grasshopper", description: "Complex geometry and parametric design." },
];

export const DESIGN_PROCESS_STEPS: ProcessStep[] = [
  { title: "Brief & Site Analysis", description: "The design problem and site conditions are studied before any drawing begins." },
  { title: "Concept Development", description: "Early ideas are tested quickly, through sketches and rough study models." },
  { title: "Iteration & Critique", description: "Concepts are pinned up, questioned, and revised — repeatedly, before committing to one direction." },
  { title: "Design Development", description: "The chosen direction is resolved in detail, across plan, section, and technical systems." },
  { title: "Final Presentation", description: "Work is presented as a complete set — drawings, models, and a defended design rationale." },
];

export interface PortfolioComponent {
  title: string;
  description: string;
}

export const PORTFOLIO_COMPONENTS: PortfolioComponent[] = [
  { title: "Studio Project Sheet", description: "A single project distilled to its key drawings and diagrams." },
  { title: "Design Thesis Summary", description: "The thesis project condensed for a recruiter audience." },
  { title: "Technical Drawing Set", description: "A sample of working drawings, demonstrating detailing ability." },
];

export interface AchievementItem {
  category: string;
  title: string;
  description: string;
}

export const STUDENT_ACHIEVEMENTS: AchievementItem[] = [
  { category: "Recognition", title: "Design Excellence Recognition", description: "Studio work selected for department-level recognition each semester." },
  { category: "Exhibition", title: "Studio Exhibition Selection", description: "Work chosen for display at the end-of-semester studio exhibition." },
  { category: "Distinction", title: "Thesis Distinction", description: "Thesis projects recognised for design rigour and resolution at final review." },
];

export const STUDENT_LIFE_PARAGRAPHS: string[] = [
  "Studio life runs on its own rhythm — long working sessions, late reviews, and a cohort that spends more time together than with anyone else on campus.",
];

export const STUDENT_LIFE_PULL_QUOTE = "Your cohort becomes your first professional network, years before graduation.";
export const STUDENT_LIFE_IMAGE_LABEL = "Replace Student Life Image";

export interface CareerPathway {
  title: string;
  description: string;
}

export const CAREER_PATHWAYS: CareerPathway[] = [
  { title: "Practicing Architect", description: "Design and documentation roles at architecture and design studios of every scale." },
  { title: "Urban & Regional Planner", description: "Planning and policy-facing roles at consultancies and public-sector bodies." },
  { title: "Design Research & Academia", description: "Further study (M.Arch, M.Plan, and allied fields) or research-oriented practice." },
  { title: "Allied Design Practice", description: "Interior, landscape, and adjacent design practices that draw on the same studio training." },
];

export interface FaqContentItem {
  question: string;
  answer: string;
}

export const STUDENTS_CTA = {
  eyebrow: "Already Enrolled?",
  title: "Sign in to manage your placement profile.",
  description: "Build your portfolio, track review status, and see it exactly as recruiters will.",
  imageLabel: "Replace Closing Image",
};

export const STUDENTS_FAQ: FaqContentItem[] = [
  {
    question: "How does the portfolio process work?",
    answer: "Studio and thesis work is compiled into a portfolio, reviewed with faculty, and submitted through your TNPArch profile for placement review.",
  },
  {
    question: "What software will I actually use?",
    answer: "AutoCAD, Revit, SketchUp, and Rhino/Grasshopper are used across studio years — see the Software Ecosystem section above.",
  },
  {
    question: "Is there support for finding internships?",
    answer: "Internships run alongside the placement process — see the Placements page for how they're coordinated.",
  },
  {
    question: "Can I access TNPArch after I graduate?",
    answer: "TNPArch is scoped to current students' placement profiles. For alumni-related queries, reach out through the Contact page.",
  },
  {
    question: "Who do I contact with programme-specific questions?",
    answer: "The Contact page routes academic and programme questions to the department directly.",
  },
];

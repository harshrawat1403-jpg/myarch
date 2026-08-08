import type { FaqContentItem } from "./placements-content";

/**
 * Static content for the public marketing site's Recruiters page
 * (Milestone 6). Deliberately thin — most of this page's content already
 * exists elsewhere ("Why Recruit," student capabilities, software, the
 * engagement workflow, and most of the FAQ all come from `public-content`,
 * `students-content`, and `placements-content`) and is imported directly
 * in the page rather than re-authored here. Only what's genuinely new to
 * this page lives in this file: hiring models, department-provided
 * support, and the handful of FAQ items no other page has asked yet.
 *
 * Version 2.0 (editorial pass): a distinct B2B identity from the rest of
 * the site — "professional, business-focused, confident," per the brief
 * — not Students with different copy. `RECRUITER_TESTIMONIALS` and
 * `RECRUITER_LOGO_COUNT` are new: honest editable placeholders, never
 * fabricated names, companies, or quotes.
 */

export const RECRUITERS_HERO = {
  eyebrow: "Recruiters",
  title: "Why recruit architecture students from VNIT?",
  subhead: "Direct, verified access to studio-trained graduates — ready to contribute from day one.",
  imageLabel: "Replace Recruiters Hero Image",
};

export interface HiringModel {
  title: string;
  commitment: string;
  duration: string;
  bestFor: string;
}

export const HIRING_MODELS: HiringModel[] = [
  {
    title: "Full-Time Placement",
    commitment: "Full-time offer",
    duration: "Standard employment",
    bestFor: "Roles hiring directly from the graduating batch.",
  },
  {
    title: "Pre-Placement Internship",
    commitment: "Internship, PPO track",
    duration: "Flexible, agreed with recruiter",
    bestFor: "Evaluating a candidate before extending a full-time offer.",
  },
  {
    title: "Internship Only",
    commitment: "Internship, no offer commitment",
    duration: "Flexible, agreed with recruiter",
    bestFor: "Short-term project support or early engagement with students.",
  },
  {
    title: "Sponsored Studio Project",
    commitment: "No hiring commitment",
    duration: "One academic semester",
    bestFor: "Introducing your practice to a cohort before a formal recruiting drive.",
  },
];

export interface SupportItem {
  title: string;
  description: string;
}

export const PLACEMENT_SUPPORT: SupportItem[] = [
  {
    title: "Coordinated Scheduling",
    description: "Pre-placement talks, tests, and interview slots are scheduled and coordinated by the department.",
  },
  {
    title: "Verified Student Directory",
    description: "Recruiter accounts get directory access scoped to students with an approved, published profile.",
  },
  {
    title: "Resume Reference Generation",
    description: "A structured resume reference is generated per student, consistent across the batch.",
  },
  {
    title: "Single Point of Contact",
    description: "The Training & Placement Cell is the one point of contact for scheduling, logistics, and queries.",
  },
];

export const RECRUITERS_FAQ_EXTRA: FaqContentItem[] = [
  {
    question: "How do we schedule a pre-placement talk?",
    answer: "Once access is granted, the Training & Placement Cell coordinates scheduling directly with your team.",
  },
  {
    question: "Do you support virtual interviews?",
    answer: "Yes — interviews and pre-placement talks can be conducted in person or virtually, based on what works for your team.",
  },
];

export interface RecruiterTestimonial {
  role: string;
  imageLabel: string;
}

/** Editable placeholders, not fabricated testimonials — no invented recruiter names, companies, or quotes until real ones are supplied. */
export const RECRUITER_TESTIMONIALS: RecruiterTestimonial[] = [
  { role: "Add a recruiter testimonial", imageLabel: "Replace Photo" },
  { role: "Add a recruiter testimonial", imageLabel: "Replace Photo" },
];

/** How many editable recruiter-logo placeholder tiles to render. */
export const RECRUITER_LOGO_COUNT = 6;

export const RECRUITERS_CTA = {
  eyebrow: "Get Started",
  title: "Ready to recruit from VNIT Architecture?",
  description: "Request access to the student directory, or see how placement outcomes look so far.",
  imageLabel: "Replace Closing Image",
};

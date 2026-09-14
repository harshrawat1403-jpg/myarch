import { DEPARTMENT_EMAIL } from "./public-content";
import type { FaqContentItem } from "./placements-content";

/**
 * Static content for the public marketing site's Contact page
 * (Milestone 7). `DEPARTMENT_EMAIL` is imported, not redeclared — the same
 * single source of truth Footer uses. `TPO_EMAIL` is a second placeholder
 * address on the same illustrative domain, not a claim about a real
 * mailbox. No phone number or street-level address is invented here: a
 * fabricated phone number risks resembling a real, currently-assigned
 * number belonging to someone unrelated, which a fabricated placeholder
 * email on a non-resolving domain does not — see the FAQ entry below,
 * which says so plainly rather than inventing digits.
 */

export const TPO_EMAIL = "support@myarch.in";

export const CONTACT_HERO = {
  eyebrow: "Contact",
  title: "One department, one point of contact.",
  subhead: "Recruiter, student, or general question — this is where to start.",
};

export interface ContactInfoPanel {
  label: string;
  description: string;
  email: string;
}

export const CONTACT_PANELS: ContactInfoPanel[] = [
  {
    label: "Department of Architecture & Planning",
    description: "General enquiries and department administration.",
    email: DEPARTMENT_EMAIL,
  },
  {
    label: "Technical Team",
    description: "MYARCH support, recruiter access, and student placement queries.",
    email: TPO_EMAIL,
  },
];

export const OFFICE_ADDRESS_LINES: string[] = [
  "Department of Architecture & Planning",
  "Visvesvaraya National Institute of Technology (VNIT)",
  "Nagpur, Maharashtra",
];

export const OFFICE_HOURS = "Monday – Friday, 10:00 AM – 5:00 PM IST";
export const OFFICE_HOURS_NOTE =
  "Hours follow the institute's academic calendar and may vary during vacations and examinations.";
export const ACCESSIBILITY_NOTE = "Accessibility and visiting arrangements are confirmed directly on request.";
export const LOCATION_IMAGE_LABEL = "Map integration pending";

export interface EnquiryRoute {
  title: string;
  description: string;
}

export const ENQUIRY_ROUTES: EnquiryRoute[] = [
  {
    title: "General Enquiries",
    description: "Programme information and department administration.",
  },
  {
    title: "Recruiter Enquiries",
    description: "Directory access, scheduling, and hiring models.",
  },
  {
    title: "Student Support",
    description: "Placement profile and portfolio review status.",
  },
];

export const CONTACT_CTA = {
  title: "We typically respond within 2–3 working days.",
  description: "For MYARCH and placement-specific queries, the Technical Team is the fastest route.",
};

export const CONTACT_FAQ: FaqContentItem[] = [
  {
    question: "How quickly will I get a response?",
    answer: "The Technical Team typically responds within 2–3 working days during the academic term.",
  },
  {
    question: "I'm a recruiter — where do I start?",
    answer: 'Select "Recruiter Access" as your reason below, or see the Recruiters page for the full process.',
  },
  {
    question: "I'm a student with a profile question — should I use this form?",
    answer: "For account-specific issues, signing in and checking your profile status is usually faster — use this form for anything that isn't covered there.",
  },
  {
    question: "Is there a phone number I can call?",
    answer: "Phone contact details are being finalised — email is the fastest way to reach the department for now.",
  },
];

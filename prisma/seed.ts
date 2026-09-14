/**
 * MYARCH showcase seed data — creates a fixed set of Secretary/Coordinator/
 * Recruiter accounts plus a ten-student roster giving the Recruiter
 * directory, the Coordinator's approval queue, and each student's own
 * profile something real to show.
 *
 * NEVER run against a production database with real student data — this
 * script is idempotent-by-email (safe to re-run in a scratch dev/staging/
 * showcase DB) but is not intended to seed or reset a live environment.
 *
 * Usage: npm run db:seed (see package.json / ENVIRONMENT_SETUP.md).
 */
import { PrismaClient, type Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
// V4.0 E3 — imported rather than hand-duplicated: these structures must
// match PublicationTemplateStructure exactly, and copying them a second
// time here would be a real drift risk this codebase has otherwise avoided
// (every other seed row below is a small literal, not a structured tree).
import { PUBLICATION_TEMPLATE_SEEDS } from "@/modules/publications/domain/template-definitions";

const prisma = new PrismaClient();

// Seed-only password for every account created here. Documented loudly
// on purpose: never use this outside a throwaway dev/staging/showcase
// database.
const SEED_PASSWORD = "Password123!";

async function upsertUser(
  email: string,
  role: "SECRETARY" | "COORDINATOR" | "STUDENT" | "RECRUITER",
) {
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 12);
  return prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, passwordHash, role },
  });
}

type ProfileState = "PUBLISHED" | "PENDING_REVIEW" | "NONE";

interface ShowcaseStudentSeed {
  email: string;
  rollNumber: string;
  fullName: string;
  cgpa: number;
  hasActiveBacklog?: boolean;
  backlogDetails?: string;
  bio?: string;
  skills?: string[];
  software?: string[];
  portfolioLinks?: string[];
  selectedProjects?: { title: string; description?: string; semester?: string }[];
  certifications?: { title: string; issuer?: string; year?: number }[];
  internships?: { company: string; role?: string; duration?: string }[];
  /** PUBLISHED = approved & live in the recruiter directory; PENDING_REVIEW = sitting in the approval queue; NONE = no draft started yet. */
  profileState: ProfileState;
}

// Ten fictional B.Arch 2026 students, giving the Recruiter directory and
// the Coordinator's approval queue a realistic, varied roster to show, not
// a single lonely profile.
const SHOWCASE_STUDENTS: ShowcaseStudentSeed[] = [
  {
    email: "gautam@vnit.ac.in",
    rollNumber: "BA2026001",
    fullName: "Gautam Deshmukh",
    cgpa: 8.9,
    bio: "Final-year architecture student exploring parametric and sustainable design methods for high-density housing.",
    skills: ["Parametric Design", "Rendering", "Sustainable Design"],
    software: ["Rhino", "Grasshopper", "Revit", "Lumion"],
    portfolioLinks: ["https://example.com/portfolio/gautam-deshmukh"],
    selectedProjects: [
      {
        title: "Vertical Village — High-Density Housing Prototype",
        description: "A parametric massing study for climate-responsive, mixed-income housing on a constrained urban site.",
        semester: "Semester 8",
      },
    ],
    certifications: [{ title: "Grasshopper for Architects", issuer: "VNIT CEP Cell", year: 2025 }],
    internships: [{ company: "Studio Example", role: "Design Intern", duration: "Jun–Aug 2025" }],
    profileState: "PUBLISHED",
  },
  {
    email: "vijay@vnit.ac.in",
    rollNumber: "BA2026002",
    fullName: "Vijay Kulkarni",
    cgpa: 8.4,
    bio: "Passionate about heritage conservation and adaptive reuse of historic structures around Nagpur.",
    skills: ["Heritage Documentation", "Sketching"],
    software: ["AutoCAD", "SketchUp"],
    profileState: "PUBLISHED",
  },
  {
    email: "devraj@vnit.ac.in",
    rollNumber: "BA2026003",
    fullName: "Devraj Singh",
    cgpa: 7.8,
    hasActiveBacklog: true,
    backlogDetails: "One backlog, Building Construction III",
    bio: "Focused on urban planning and transit-oriented development for growing tier-2 cities.",
    skills: ["Urban Analysis", "Site Planning"],
    software: ["AutoCAD", "QGIS"],
    profileState: "PUBLISHED",
  },
  {
    email: "karan@vnit.ac.in",
    rollNumber: "BA2026004",
    fullName: "Karan Mehta",
    cgpa: 8.1,
    bio: "Interior architecture enthusiast with an eye for material texture and light.",
    skills: ["Interior Detailing", "Material Studies"],
    software: ["SketchUp", "V-Ray", "Photoshop"],
    profileState: "PUBLISHED",
  },
  {
    email: "praful@vnit.ac.in",
    rollNumber: "BA2026005",
    fullName: "Praful Joshi",
    cgpa: 7.6,
    bio: "Landscape architecture student researching climate-responsive public spaces.",
    skills: ["Landscape Design", "Site Planning"],
    software: ["AutoCAD", "SketchUp", "Lumion"],
    profileState: "PUBLISHED",
  },
  {
    email: "saurabh@vnit.ac.in",
    rollNumber: "BA2026006",
    fullName: "Saurabh Patil",
    cgpa: 9.0,
    bio: "Exploring digital fabrication and parametric modeling for modular construction.",
    skills: ["Digital Fabrication", "Parametric Modeling"],
    software: ["Rhino", "Grasshopper"],
    profileState: "PUBLISHED",
  },
  {
    email: "namish@vnit.ac.in",
    rollNumber: "BA2026007",
    fullName: "Namish Rao",
    cgpa: 7.9,
    bio: "Interested in affordable housing and community-driven design processes.",
    skills: ["Community Design", "Sketching"],
    software: ["AutoCAD"],
    // Draft submitted, awaiting review — exercises the Coordinator/Secretary approval queue.
    profileState: "PENDING_REVIEW",
  },
  {
    email: "vaibhav@vnit.ac.in",
    rollNumber: "BA2026008",
    fullName: "Vaibhav Shah",
    cgpa: 8.3,
    bio: "Studies structural systems and their expression in contemporary architecture.",
    skills: ["Structural Analysis", "Model Making"],
    software: ["Revit", "AutoCAD"],
    profileState: "PUBLISHED",
  },
  {
    email: "harsh@vnit.ac.in",
    rollNumber: "BA2026009",
    fullName: "Harsh Verma",
    cgpa: 8.6,
    bio: "Designs furniture and small-scale products alongside architectural studio work.",
    skills: ["Furniture Design", "Model Making"],
    software: ["Rhino", "SketchUp"],
    profileState: "PUBLISHED",
  },
  {
    email: "saivardhan@vnit.ac.in",
    rollNumber: "BA2026010",
    fullName: "Saivardhan Reddy",
    cgpa: 9.2,
    // No draft yet — exercises the "nothing to review" / empty-state paths.
    profileState: "NONE",
  },
];

async function main() {
  console.log("Seeding MYARCH showcase data (seed password for every account: %s)...", SEED_PASSWORD);

  // Approving/publishing a profile is a Secretary-only action in the real
  // permission model (canApprovePublicProfile) and publication templates
  // need a real creator — using this account for that attribution keeps
  // the seed data internally consistent with how the app actually works,
  // rather than attributing those rows to the Coordinator, who could never
  // really have performed them.
  const secretaryUser = await upsertUser("secretary@myarch.in", "SECRETARY");
  await prisma.secretaryProfile.upsert({
    where: { userId: secretaryUser.id },
    update: {},
    create: { userId: secretaryUser.id, fullName: "Priya Sharma" },
  });

  const batch = await prisma.batch.upsert({
    where: { id: "00000000-0000-0000-0000-000000000001" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000001",
      name: "B.Arch 2026",
      year: 2026,
      status: "ACTIVE",
    },
  });

  const coordinatorUser = await upsertUser("coordinator@myarch.in", "COORDINATOR");
  const coordinatorProfile = await prisma.coordinatorProfile.upsert({
    where: { userId: coordinatorUser.id },
    update: {},
    create: { userId: coordinatorUser.id, fullName: "Arjun Mehta", position: "T_AND_P" },
  });
  await prisma.coordinatorBatchScope.upsert({
    where: {
      coordinatorProfileId_batchId: { coordinatorProfileId: coordinatorProfile.id, batchId: batch.id },
    },
    update: {},
    create: { coordinatorProfileId: coordinatorProfile.id, batchId: batch.id },
  });

  const recruiterUser = await upsertUser("recruiter@example.com", "RECRUITER");
  await prisma.recruiterProfile.upsert({
    where: { userId: recruiterUser.id },
    update: {},
    create: { userId: recruiterUser.id, fullName: "Jordan Lee", companyName: "Studio Example" },
  });

  for (const [index, s] of SHOWCASE_STUDENTS.entries()) {
    const studentUser = await upsertUser(s.email, "STUDENT");
    const student = await prisma.studentProfile.upsert({
      where: { rollNumber: s.rollNumber },
      update: {},
      create: {
        userId: studentUser.id,
        batchId: batch.id,
        rollNumber: s.rollNumber,
        fullName: s.fullName,
      },
    });

    const localPart = s.email.split("@")[0];
    await prisma.studentPrivateProfile.upsert({
      where: { studentProfileId: student.id },
      update: {},
      create: {
        studentProfileId: student.id,
        phone: `98000000${String(index + 1).padStart(2, "0")}`,
        personalEmail: `${localPart}.personal@example.com`,
        cgpa: s.cgpa,
        hasActiveBacklog: s.hasActiveBacklog ?? false,
        backlogDetails: s.backlogDetails,
      },
    });

    if (s.profileState === "NONE") continue;

    const draft = await prisma.studentPublicProfileDraft.upsert({
      where: { studentProfileId: student.id },
      update: {},
      create: {
        studentProfileId: student.id,
        bio: s.bio,
        skills: s.skills ?? [],
        software: s.software ?? [],
        portfolioLinks: s.portfolioLinks ?? [],
        selectedProjects: (s.selectedProjects ?? []) as unknown as Prisma.InputJsonValue,
        certifications: (s.certifications ?? []) as unknown as Prisma.InputJsonValue,
        internships: (s.internships ?? []) as unknown as Prisma.InputJsonValue,
        status: s.profileState === "PUBLISHED" ? "APPROVED" : "PENDING_REVIEW",
        submittedAt: new Date(),
        ...(s.profileState === "PUBLISHED"
          ? { reviewedByUserId: secretaryUser.id, reviewedAt: new Date() }
          : {}),
      },
    });

    if (s.profileState === "PUBLISHED") {
      await prisma.studentPublicProfile.upsert({
        where: { studentProfileId: student.id },
        update: {},
        create: {
          studentProfileId: student.id,
          bio: draft.bio,
          skills: draft.skills,
          software: draft.software,
          portfolioLinks: draft.portfolioLinks,
          selectedProjects: draft.selectedProjects as unknown as Prisma.InputJsonValue,
          certifications: draft.certifications as unknown as Prisma.InputJsonValue,
          internships: draft.internships as unknown as Prisma.InputJsonValue,
          publishedFromDraftId: draft.id,
          publishedByUserId: secretaryUser.id,
        },
      });
    }
  }

  // V4.0 E3 — the ten publication kinds (§13.1), seeded once. No
  // template-authoring UI exists in V4.0; the app's own flow starts at
  // "Choose Template," so these rows are the only source of templates.
  for (const seed of PUBLICATION_TEMPLATE_SEEDS) {
    const existing = await prisma.publicationTemplate.findFirst({ where: { name: seed.name } });
    if (existing) continue;
    await prisma.publicationTemplate.create({
      data: {
        name: seed.name,
        type: seed.type,
        description: seed.description,
        structureJson: seed.structure as unknown as Prisma.InputJsonValue,
        status: "ACTIVE",
        createdByUserId: secretaryUser.id,
      },
    });
  }

  const published = SHOWCASE_STUDENTS.filter((s) => s.profileState === "PUBLISHED").length;
  const pending = SHOWCASE_STUDENTS.filter((s) => s.profileState === "PENDING_REVIEW").length;
  const none = SHOWCASE_STUDENTS.filter((s) => s.profileState === "NONE").length;

  console.log("Seed complete:");
  console.log("  Coordinator (scoped to B.Arch 2026): coordinator@myarch.in");
  console.log("  Recruiter:                            recruiter@example.com");
  console.log("  Student (primary):                    gautam@vnit.ac.in");
  console.log(
    "  Students seeded: %d (%d published, %d pending review, %d with no draft)",
    SHOWCASE_STUDENTS.length,
    published,
    pending,
    none,
  );
  console.log("  Password for every seeded account: %s", SEED_PASSWORD);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

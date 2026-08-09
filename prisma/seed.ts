/**
 * Minimal development/staging seed data — creates one account per role plus
 * enough Batch/Student/Profile state to exercise every major flow (login,
 * approval queue, recruiter directory, exports) without hand-creating data
 * through the UI first.
 *
 * NEVER run against a production database with real student data — this
 * script is idempotent-by-email (safe to re-run in a scratch dev/staging
 * DB) but is not intended to seed or reset a live environment.
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
// on purpose: never use this outside a throwaway dev/staging database.
const SEED_PASSWORD = "Password123!";

async function upsertUser(email: string, role: "SECRETARY" | "COORDINATOR" | "STUDENT" | "RECRUITER") {
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 12);
  return prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, passwordHash, role },
  });
}

async function main() {
  console.log("Seeding development data (seed password for every account: %s)...", SEED_PASSWORD);

  const secretaryUser = await upsertUser("secretary@tnparch.in", "SECRETARY");
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

  const coordinatorUser = await upsertUser("coordinator@tnparch.in", "COORDINATOR");
  const coordinatorProfile = await prisma.coordinatorProfile.upsert({
    where: { userId: coordinatorUser.id },
    update: {},
    create: { userId: coordinatorUser.id, fullName: "Arjun Mehta", position: "T_AND_P" },
  });
  await prisma.coordinatorBatchScope.upsert({
    where: { coordinatorProfileId_batchId: { coordinatorProfileId: coordinatorProfile.id, batchId: batch.id } },
    update: {},
    create: { coordinatorProfileId: coordinatorProfile.id, batchId: batch.id },
  });

  const recruiterUser = await upsertUser("recruiter@example.com", "RECRUITER");
  await prisma.recruiterProfile.upsert({
    where: { userId: recruiterUser.id },
    update: {},
    create: { userId: recruiterUser.id, fullName: "Jordan Lee", companyName: "Studio Example" },
  });

  // Student 1: fully approved public profile — visible in the recruiter directory and exports.
  const student1User = await upsertUser("alice@vnit.ac.in", "STUDENT");
  const student1 = await prisma.studentProfile.upsert({
    where: { rollNumber: "BA2026001" },
    update: {},
    create: {
      userId: student1User.id,
      batchId: batch.id,
      rollNumber: "BA2026001",
      fullName: "Alice Architect",
    },
  });
  await prisma.studentPrivateProfile.upsert({
    where: { studentProfileId: student1.id },
    update: {},
    create: {
      studentProfileId: student1.id,
      phone: "9876543210",
      personalEmail: "alice.personal@example.com",
      cgpa: 8.7,
      hasActiveBacklog: false,
    },
  });
  const student1Draft = await prisma.studentPublicProfileDraft.upsert({
    where: { studentProfileId: student1.id },
    update: {},
    create: {
      studentProfileId: student1.id,
      bio: "Aspiring architect focused on sustainable urban design.",
      skills: ["Rendering", "Model Making"],
      software: ["Rhino", "Revit", "AutoCAD"],
      status: "APPROVED",
      submittedAt: new Date(),
      reviewedByUserId: secretaryUser.id,
      reviewedAt: new Date(),
    },
  });
  await prisma.studentPublicProfile.upsert({
    where: { studentProfileId: student1.id },
    update: {},
    create: {
      studentProfileId: student1.id,
      bio: student1Draft.bio,
      skills: student1Draft.skills,
      software: student1Draft.software,
      publishedFromDraftId: student1Draft.id,
      publishedByUserId: secretaryUser.id,
    },
  });

  // Student 2: draft submitted, awaiting review — exercises the approval queue.
  const student2User = await upsertUser("bilal@vnit.ac.in", "STUDENT");
  const student2 = await prisma.studentProfile.upsert({
    where: { rollNumber: "BA2026002" },
    update: {},
    create: {
      userId: student2User.id,
      batchId: batch.id,
      rollNumber: "BA2026002",
      fullName: "Bilal Khan",
    },
  });
  await prisma.studentPrivateProfile.upsert({
    where: { studentProfileId: student2.id },
    update: {},
    create: { studentProfileId: student2.id, cgpa: 7.9, hasActiveBacklog: true, backlogDetails: "One backlog, Structures II" },
  });
  await prisma.studentPublicProfileDraft.upsert({
    where: { studentProfileId: student2.id },
    update: {},
    create: {
      studentProfileId: student2.id,
      bio: "Interested in heritage conservation.",
      skills: ["Sketching"],
      software: ["AutoCAD"],
      status: "PENDING_REVIEW",
      submittedAt: new Date(),
    },
  });

  // Student 3: no draft yet — exercises the "nothing to review" / empty-state paths.
  const student3User = await upsertUser("chitra@vnit.ac.in", "STUDENT");
  await prisma.studentProfile.upsert({
    where: { rollNumber: "BA2026003" },
    update: {},
    create: {
      userId: student3User.id,
      batchId: batch.id,
      rollNumber: "BA2026003",
      fullName: "Chitra Nair",
    },
  });
  await prisma.studentPrivateProfile.upsert({
    where: { studentProfileId: (await prisma.studentProfile.findUniqueOrThrow({ where: { rollNumber: "BA2026003" } })).id },
    update: {},
    create: {
      studentProfileId: (await prisma.studentProfile.findUniqueOrThrow({ where: { rollNumber: "BA2026003" } })).id,
      cgpa: 9.1,
    },
  });

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

  console.log("Seed complete:");
  console.log("  Secretary:   secretary@tnparch.in");
  console.log("  Coordinator: coordinator@tnparch.in (scoped to B.Arch 2026)");
  console.log("  Recruiter:   recruiter@example.com");
  console.log("  Students:    alice@vnit.ac.in (approved), bilal@vnit.ac.in (pending review), chitra@vnit.ac.in (no draft)");
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

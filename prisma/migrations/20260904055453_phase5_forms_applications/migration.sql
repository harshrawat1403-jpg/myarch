-- CreateEnum
CREATE TYPE "FormStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CLOSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "FormFieldType" AS ENUM ('TEXT', 'LONG_TEXT', 'NUMBER', 'EMAIL', 'DROPDOWN', 'RADIO', 'CHECKBOX', 'DATE');

-- CreateEnum
CREATE TYPE "FormApplicationStatus" AS ENUM ('SUBMITTED', 'UNDER_REVIEW', 'SELECTED', 'REJECTED');

-- CreateTable
CREATE TABLE "forms" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "FormStatus" NOT NULL DEFAULT 'DRAFT',
    "deadline" TIMESTAMP(3),
    "committeeId" UUID,
    "createdByUserId" UUID NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "forms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "form_fields" (
    "id" UUID NOT NULL,
    "formId" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" "FormFieldType" NOT NULL,
    "description" TEXT,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "options" JSONB,
    "validation" JSONB,
    "displayOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "form_fields_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "form_submissions" (
    "id" UUID NOT NULL,
    "formId" UUID NOT NULL,
    "applicantUserId" UUID NOT NULL,
    "studentProfileId" UUID NOT NULL,
    "answers" JSONB NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "form_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "form_applications" (
    "id" UUID NOT NULL,
    "submissionId" UUID NOT NULL,
    "currentStatus" "FormApplicationStatus" NOT NULL DEFAULT 'SUBMITTED',
    "decisionReason" TEXT,
    "decidedByUserId" UUID,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "form_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "form_application_reviewers" (
    "id" UUID NOT NULL,
    "applicationId" UUID NOT NULL,
    "reviewerUserId" UUID NOT NULL,
    "assignedByUserId" UUID NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unassignedAt" TIMESTAMP(3),

    CONSTRAINT "form_application_reviewers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "form_application_reviews" (
    "id" UUID NOT NULL,
    "applicationId" UUID NOT NULL,
    "reviewerUserId" UUID NOT NULL,
    "notes" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "form_application_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "form_application_status_events" (
    "id" UUID NOT NULL,
    "applicationId" UUID NOT NULL,
    "fromStatus" "FormApplicationStatus",
    "toStatus" "FormApplicationStatus" NOT NULL,
    "note" TEXT,
    "changedByUserId" UUID NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "form_application_status_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "forms_status_idx" ON "forms"("status");

-- CreateIndex
CREATE INDEX "forms_committeeId_idx" ON "forms"("committeeId");

-- CreateIndex
CREATE INDEX "form_fields_formId_displayOrder_idx" ON "form_fields"("formId", "displayOrder");

-- CreateIndex
CREATE UNIQUE INDEX "form_fields_formId_key_key" ON "form_fields"("formId", "key");

-- CreateIndex
CREATE INDEX "form_submissions_applicantUserId_idx" ON "form_submissions"("applicantUserId");

-- CreateIndex
CREATE INDEX "form_submissions_studentProfileId_idx" ON "form_submissions"("studentProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "form_submissions_formId_applicantUserId_key" ON "form_submissions"("formId", "applicantUserId");

-- CreateIndex
CREATE UNIQUE INDEX "form_applications_submissionId_key" ON "form_applications"("submissionId");

-- CreateIndex
CREATE INDEX "form_applications_currentStatus_idx" ON "form_applications"("currentStatus");

-- CreateIndex
CREATE INDEX "form_application_reviewers_applicationId_idx" ON "form_application_reviewers"("applicationId");

-- CreateIndex
CREATE INDEX "form_application_reviewers_reviewerUserId_unassignedAt_idx" ON "form_application_reviewers"("reviewerUserId", "unassignedAt");

-- CreateIndex
CREATE INDEX "form_application_reviews_applicationId_idx" ON "form_application_reviews"("applicationId");

-- CreateIndex
CREATE INDEX "form_application_reviews_reviewerUserId_idx" ON "form_application_reviews"("reviewerUserId");

-- CreateIndex
CREATE INDEX "form_application_status_events_applicationId_idx" ON "form_application_status_events"("applicationId");

-- AddForeignKey
ALTER TABLE "forms" ADD CONSTRAINT "forms_committeeId_fkey" FOREIGN KEY ("committeeId") REFERENCES "committees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forms" ADD CONSTRAINT "forms_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_fields" ADD CONSTRAINT "form_fields_formId_fkey" FOREIGN KEY ("formId") REFERENCES "forms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_submissions" ADD CONSTRAINT "form_submissions_formId_fkey" FOREIGN KEY ("formId") REFERENCES "forms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_submissions" ADD CONSTRAINT "form_submissions_applicantUserId_fkey" FOREIGN KEY ("applicantUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_submissions" ADD CONSTRAINT "form_submissions_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "student_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_applications" ADD CONSTRAINT "form_applications_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "form_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_applications" ADD CONSTRAINT "form_applications_decidedByUserId_fkey" FOREIGN KEY ("decidedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_application_reviewers" ADD CONSTRAINT "form_application_reviewers_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "form_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_application_reviewers" ADD CONSTRAINT "form_application_reviewers_reviewerUserId_fkey" FOREIGN KEY ("reviewerUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_application_reviewers" ADD CONSTRAINT "form_application_reviewers_assignedByUserId_fkey" FOREIGN KEY ("assignedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_application_reviews" ADD CONSTRAINT "form_application_reviews_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "form_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_application_reviews" ADD CONSTRAINT "form_application_reviews_reviewerUserId_fkey" FOREIGN KEY ("reviewerUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_application_status_events" ADD CONSTRAINT "form_application_status_events_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "form_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_application_status_events" ADD CONSTRAINT "form_application_status_events_changedByUserId_fkey" FOREIGN KEY ("changedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

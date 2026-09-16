-- Simplified TNP + Alumni foundation. This migration is intentionally
-- additive: it creates side-by-side platform tables only and does not alter,
-- rename, backfill, or remove any legacy MYARCH data.

CREATE TYPE "TalentProfileVisibility" AS ENUM ('DRAFT', 'PUBLISHED', 'HIDDEN');
CREATE TYPE "TalentDocumentKind" AS ENUM ('RESUME', 'PORTFOLIO');
CREATE TYPE "TalentDocumentVisibility" AS ENUM ('PRIVATE', 'PUBLISHED');
CREATE TYPE "RecruiterCompanyRole" AS ENUM ('OWNER', 'RECRUITER');
CREATE TYPE "RecruitmentOpportunityType" AS ENUM ('PLACEMENT', 'INTERNSHIP');
CREATE TYPE "RecruitmentOpportunityStatus" AS ENUM ('DRAFT', 'OPEN', 'CLOSED', 'COMPLETED');
CREATE TYPE "RecruitmentWorkMode" AS ENUM ('ONSITE', 'HYBRID', 'REMOTE');
CREATE TYPE "RecruitmentApplicationStatus" AS ENUM ('APPLIED', 'SHORTLISTED', 'SELECTED', 'REJECTED', 'WITHDRAWN');
CREATE TYPE "RecruitmentOutcomeStatus" AS ENUM ('SEEKING', 'PLACED', 'HIGHER_STUDIES', 'ENTREPRENEURSHIP', 'NOT_SEEKING', 'OTHER');
CREATE TYPE "AlumniNetworkApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE "AlumniNetworkVisibility" AS ENUM ('HIDDEN', 'DIRECTORY');

CREATE TABLE "talent_profiles" (
    "id" UUID NOT NULL,
    "studentProfileId" UUID NOT NULL,
    "professionalHeadline" TEXT,
    "bio" TEXT,
    "specialization" TEXT,
    "interests" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "linkedInUrl" TEXT,
    "behanceUrl" TEXT,
    "portfolioWebsiteUrl" TEXT,
    "visibility" "TalentProfileVisibility" NOT NULL DEFAULT 'DRAFT',
    "resumeVisible" BOOLEAN NOT NULL DEFAULT false,
    "cgpaVisible" BOOLEAN NOT NULL DEFAULT false,
    "contactVisible" BOOLEAN NOT NULL DEFAULT false,
    "placementAvailable" BOOLEAN NOT NULL DEFAULT true,
    "internshipAvailable" BOOLEAN NOT NULL DEFAULT true,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "talent_profiles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "talent_projects" (
    "id" UUID NOT NULL,
    "talentProfileId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "projectType" TEXT,
    "academicPeriod" TEXT,
    "shortDescription" TEXT,
    "detailedDescription" TEXT,
    "coverFileId" UUID,
    "externalUrl" TEXT,
    "skills" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "software" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "visibility" "TalentProfileVisibility" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "talent_projects_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "talent_project_images" (
    "id" UUID NOT NULL,
    "talentProjectId" UUID NOT NULL,
    "fileId" UUID NOT NULL,
    "caption" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "talent_project_images_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "talent_skills" (
    "id" UUID NOT NULL,
    "talentProfileId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "talent_skills_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "talent_experiences" (
    "id" UUID NOT NULL,
    "talentProfileId" UUID NOT NULL,
    "organization" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "description" TEXT,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "talent_experiences_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "talent_achievements" (
    "id" UUID NOT NULL,
    "talentProfileId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "issuer" TEXT,
    "achievedAt" TIMESTAMP(3),
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "talent_achievements_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "talent_documents" (
    "id" UUID NOT NULL,
    "talentProfileId" UUID NOT NULL,
    "kind" "TalentDocumentKind" NOT NULL,
    "fileId" UUID NOT NULL,
    "visibility" "TalentDocumentVisibility" NOT NULL DEFAULT 'PRIVATE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "talent_documents_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "recruiting_companies" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "website" TEXT,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "recruiting_companies_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "recruiter_company_memberships" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "role" "RecruiterCompanyRole" NOT NULL DEFAULT 'RECRUITER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "recruiter_company_memberships_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "recruitment_opportunities" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "createdByUserId" UUID NOT NULL,
    "type" "RecruitmentOpportunityType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "workMode" "RecruitmentWorkMode",
    "ctc" DECIMAL(12,2),
    "stipend" DECIMAL(12,2),
    "internshipDurationMonths" INTEGER,
    "minimumCgpa" DECIMAL(4,2),
    "eligibleProgramCodes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "eligibleBatchIds" UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
    "deadline" TIMESTAMP(3),
    "driveDate" TIMESTAMP(3),
    "status" "RecruitmentOpportunityStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "recruitment_opportunities_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "recruitment_applications" (
    "id" UUID NOT NULL,
    "studentProfileId" UUID NOT NULL,
    "opportunityId" UUID NOT NULL,
    "currentStatus" "RecruitmentApplicationStatus" NOT NULL DEFAULT 'APPLIED',
    "submittedResumeFileId" UUID,
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "recruitment_applications_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "recruitment_application_status_history" (
    "id" UUID NOT NULL,
    "recruitmentApplicationId" UUID NOT NULL,
    "fromStatus" "RecruitmentApplicationStatus",
    "toStatus" "RecruitmentApplicationStatus" NOT NULL,
    "note" TEXT,
    "changedByUserId" UUID NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "recruitment_application_status_history_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "recruitment_placement_outcomes" (
    "id" UUID NOT NULL,
    "studentProfileId" UUID NOT NULL,
    "status" "RecruitmentOutcomeStatus" NOT NULL DEFAULT 'SEEKING',
    "companyId" UUID,
    "role" TEXT,
    "ctc" DECIMAL(12,2),
    "placementDate" TIMESTAMP(3),
    "recordedByUserId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "recruitment_placement_outcomes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "alumni_network_profiles" (
    "id" UUID NOT NULL,
    "userId" UUID,
    "email" TEXT,
    "fullName" TEXT NOT NULL,
    "graduationYear" INTEGER NOT NULL,
    "program" TEXT,
    "currentCompany" TEXT,
    "currentRole" TEXT,
    "industry" TEXT,
    "city" TEXT,
    "linkedInUrl" TEXT,
    "websiteUrl" TEXT,
    "bio" TEXT,
    "expertise" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "mentorshipAvailable" BOOLEAN NOT NULL DEFAULT false,
    "contributionOptIn" BOOLEAN NOT NULL DEFAULT false,
    "visibility" "AlumniNetworkVisibility" NOT NULL DEFAULT 'HIDDEN',
    "approvalStatus" "AlumniNetworkApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "alumni_network_profiles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "talent_profiles_studentProfileId_key" ON "talent_profiles"("studentProfileId");
CREATE INDEX "talent_profiles_visibility_idx" ON "talent_profiles"("visibility");
CREATE UNIQUE INDEX "talent_projects_slug_key" ON "talent_projects"("slug");
CREATE UNIQUE INDEX "talent_projects_coverFileId_key" ON "talent_projects"("coverFileId");
CREATE INDEX "talent_projects_talentProfileId_sortOrder_idx" ON "talent_projects"("talentProfileId", "sortOrder");
CREATE INDEX "talent_projects_visibility_idx" ON "talent_projects"("visibility");
CREATE UNIQUE INDEX "talent_project_images_fileId_key" ON "talent_project_images"("fileId");
CREATE INDEX "talent_project_images_talentProjectId_sortOrder_idx" ON "talent_project_images"("talentProjectId", "sortOrder");
CREATE UNIQUE INDEX "talent_skills_talentProfileId_name_key" ON "talent_skills"("talentProfileId", "name");
CREATE INDEX "talent_skills_name_idx" ON "talent_skills"("name");
CREATE INDEX "talent_experiences_talentProfileId_idx" ON "talent_experiences"("talentProfileId");
CREATE INDEX "talent_achievements_talentProfileId_idx" ON "talent_achievements"("talentProfileId");
CREATE UNIQUE INDEX "talent_documents_fileId_key" ON "talent_documents"("fileId");
CREATE UNIQUE INDEX "talent_documents_talentProfileId_kind_key" ON "talent_documents"("talentProfileId", "kind");
CREATE UNIQUE INDEX "recruiting_companies_name_key" ON "recruiting_companies"("name");
CREATE UNIQUE INDEX "recruiter_company_memberships_userId_companyId_key" ON "recruiter_company_memberships"("userId", "companyId");
CREATE INDEX "recruiter_company_memberships_companyId_idx" ON "recruiter_company_memberships"("companyId");
CREATE INDEX "recruitment_opportunities_companyId_status_idx" ON "recruitment_opportunities"("companyId", "status");
CREATE INDEX "recruitment_opportunities_status_deadline_idx" ON "recruitment_opportunities"("status", "deadline");
CREATE UNIQUE INDEX "recruitment_applications_studentProfileId_opportunityId_key" ON "recruitment_applications"("studentProfileId", "opportunityId");
CREATE INDEX "recruitment_applications_opportunityId_currentStatus_idx" ON "recruitment_applications"("opportunityId", "currentStatus");
CREATE INDEX "recruitment_applications_studentProfileId_idx" ON "recruitment_applications"("studentProfileId");
CREATE INDEX "recruitment_application_status_history_recruitmentApplicationId_occurredAt_idx" ON "recruitment_application_status_history"("recruitmentApplicationId", "occurredAt");
CREATE UNIQUE INDEX "recruitment_placement_outcomes_studentProfileId_key" ON "recruitment_placement_outcomes"("studentProfileId");
CREATE INDEX "recruitment_placement_outcomes_status_idx" ON "recruitment_placement_outcomes"("status");
CREATE UNIQUE INDEX "alumni_network_profiles_userId_key" ON "alumni_network_profiles"("userId");
CREATE UNIQUE INDEX "alumni_network_profiles_email_key" ON "alumni_network_profiles"("email");
CREATE INDEX "alumni_network_profiles_approvalStatus_visibility_idx" ON "alumni_network_profiles"("approvalStatus", "visibility");
CREATE INDEX "alumni_network_profiles_graduationYear_idx" ON "alumni_network_profiles"("graduationYear");

ALTER TABLE "talent_profiles" ADD CONSTRAINT "talent_profiles_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "student_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "talent_projects" ADD CONSTRAINT "talent_projects_talentProfileId_fkey" FOREIGN KEY ("talentProfileId") REFERENCES "talent_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "talent_projects" ADD CONSTRAINT "talent_projects_coverFileId_fkey" FOREIGN KEY ("coverFileId") REFERENCES "file_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "talent_project_images" ADD CONSTRAINT "talent_project_images_talentProjectId_fkey" FOREIGN KEY ("talentProjectId") REFERENCES "talent_projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "talent_project_images" ADD CONSTRAINT "talent_project_images_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "file_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "talent_skills" ADD CONSTRAINT "talent_skills_talentProfileId_fkey" FOREIGN KEY ("talentProfileId") REFERENCES "talent_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "talent_experiences" ADD CONSTRAINT "talent_experiences_talentProfileId_fkey" FOREIGN KEY ("talentProfileId") REFERENCES "talent_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "talent_achievements" ADD CONSTRAINT "talent_achievements_talentProfileId_fkey" FOREIGN KEY ("talentProfileId") REFERENCES "talent_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "talent_documents" ADD CONSTRAINT "talent_documents_talentProfileId_fkey" FOREIGN KEY ("talentProfileId") REFERENCES "talent_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "talent_documents" ADD CONSTRAINT "talent_documents_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "file_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "recruiter_company_memberships" ADD CONSTRAINT "recruiter_company_memberships_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "recruiter_company_memberships" ADD CONSTRAINT "recruiter_company_memberships_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "recruiting_companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "recruitment_opportunities" ADD CONSTRAINT "recruitment_opportunities_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "recruiting_companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "recruitment_opportunities" ADD CONSTRAINT "recruitment_opportunities_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "recruitment_applications" ADD CONSTRAINT "recruitment_applications_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "student_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "recruitment_applications" ADD CONSTRAINT "recruitment_applications_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "recruitment_opportunities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "recruitment_applications" ADD CONSTRAINT "recruitment_applications_submittedResumeFileId_fkey" FOREIGN KEY ("submittedResumeFileId") REFERENCES "file_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "recruitment_application_status_history" ADD CONSTRAINT "recruitment_application_status_history_recruitmentApplicationId_fkey" FOREIGN KEY ("recruitmentApplicationId") REFERENCES "recruitment_applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "recruitment_application_status_history" ADD CONSTRAINT "recruitment_application_status_history_changedByUserId_fkey" FOREIGN KEY ("changedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "recruitment_placement_outcomes" ADD CONSTRAINT "recruitment_placement_outcomes_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "student_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "recruitment_placement_outcomes" ADD CONSTRAINT "recruitment_placement_outcomes_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "recruiting_companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "recruitment_placement_outcomes" ADD CONSTRAINT "recruitment_placement_outcomes_recordedByUserId_fkey" FOREIGN KEY ("recordedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "alumni_network_profiles" ADD CONSTRAINT "alumni_network_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateEnum
CREATE TYPE "PublicationType" AS ENUM ('BROCHURE', 'BOOKLET', 'PORTFOLIO_BOOK', 'ANNUAL_REPORT', 'NEWSLETTER', 'MAGAZINE', 'CUSTOM');

-- CreateEnum
CREATE TYPE "PublicationTemplateStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "PublicationStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "PublicationPageSize" AS ENUM ('A4_PORTRAIT', 'A4_LANDSCAPE', 'A3', 'CUSTOM');

-- CreateEnum
CREATE TYPE "PublicationExportFormat" AS ENUM ('PDF', 'PPTX', 'PNG', 'JPEG');

-- CreateEnum
CREATE TYPE "PublicationExportStatus" AS ENUM ('PENDING', 'GENERATING', 'READY', 'FAILED');

-- CreateTable
CREATE TABLE "publication_templates" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" "PublicationType" NOT NULL,
    "description" TEXT,
    "thumbnailFileId" UUID,
    "structureJson" JSONB NOT NULL,
    "status" "PublicationTemplateStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdByUserId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "publication_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "publications" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "type" "PublicationType" NOT NULL,
    "status" "PublicationStatus" NOT NULL DEFAULT 'DRAFT',
    "templateId" UUID,
    "contentJson" JSONB NOT NULL,
    "pageSize" "PublicationPageSize" NOT NULL DEFAULT 'A4_PORTRAIT',
    "customDimensions" JSONB,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdByUserId" UUID NOT NULL,
    "lastEditedByUserId" UUID NOT NULL,
    "lastEditedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "publications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "publication_versions" (
    "id" UUID NOT NULL,
    "publicationId" UUID NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "contentJsonSnapshot" JSONB NOT NULL,
    "label" TEXT,
    "createdByUserId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "publication_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "publication_exports" (
    "id" UUID NOT NULL,
    "publicationId" UUID NOT NULL,
    "format" "PublicationExportFormat" NOT NULL,
    "status" "PublicationExportStatus" NOT NULL DEFAULT 'PENDING',
    "fileId" UUID,
    "errorMessage" TEXT,
    "generatedByUserId" UUID NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "publication_exports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "publication_templates_thumbnailFileId_key" ON "publication_templates"("thumbnailFileId");

-- CreateIndex
CREATE INDEX "publication_templates_type_idx" ON "publication_templates"("type");

-- CreateIndex
CREATE INDEX "publications_status_idx" ON "publications"("status");

-- CreateIndex
CREATE INDEX "publications_type_idx" ON "publications"("type");

-- CreateIndex
CREATE INDEX "publication_versions_publicationId_idx" ON "publication_versions"("publicationId");

-- CreateIndex
CREATE UNIQUE INDEX "publication_versions_publicationId_versionNumber_key" ON "publication_versions"("publicationId", "versionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "publication_exports_fileId_key" ON "publication_exports"("fileId");

-- CreateIndex
CREATE INDEX "publication_exports_publicationId_idx" ON "publication_exports"("publicationId");

-- AddForeignKey
ALTER TABLE "publication_templates" ADD CONSTRAINT "publication_templates_thumbnailFileId_fkey" FOREIGN KEY ("thumbnailFileId") REFERENCES "file_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publication_templates" ADD CONSTRAINT "publication_templates_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publications" ADD CONSTRAINT "publications_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "publication_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publications" ADD CONSTRAINT "publications_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publications" ADD CONSTRAINT "publications_lastEditedByUserId_fkey" FOREIGN KEY ("lastEditedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publication_versions" ADD CONSTRAINT "publication_versions_publicationId_fkey" FOREIGN KEY ("publicationId") REFERENCES "publications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publication_versions" ADD CONSTRAINT "publication_versions_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publication_exports" ADD CONSTRAINT "publication_exports_publicationId_fkey" FOREIGN KEY ("publicationId") REFERENCES "publications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publication_exports" ADD CONSTRAINT "publication_exports_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "file_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publication_exports" ADD CONSTRAINT "publication_exports_generatedByUserId_fkey" FOREIGN KEY ("generatedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

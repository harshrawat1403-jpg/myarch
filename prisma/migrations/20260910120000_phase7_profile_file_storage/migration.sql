CREATE TABLE "student_portfolio_images" (
    "id" UUID NOT NULL,
    "studentProfileId" UUID NOT NULL,
    "fileId" UUID NOT NULL,
    "draftId" UUID,
    "publishedProfileId" UUID,
    "title" TEXT,
    "caption" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_portfolio_images_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "student_portfolio_images_association_check" CHECK ("draftId" IS NOT NULL OR "publishedProfileId" IS NOT NULL)
);

CREATE UNIQUE INDEX "student_portfolio_images_fileId_key" ON "student_portfolio_images"("fileId");
CREATE INDEX "student_portfolio_images_studentProfileId_idx" ON "student_portfolio_images"("studentProfileId");
CREATE INDEX "student_portfolio_images_draftId_sortOrder_idx" ON "student_portfolio_images"("draftId", "sortOrder");
CREATE INDEX "student_portfolio_images_publishedProfileId_sortOrder_idx" ON "student_portfolio_images"("publishedProfileId", "sortOrder");

ALTER TABLE "student_portfolio_images" ADD CONSTRAINT "student_portfolio_images_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "student_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "student_portfolio_images" ADD CONSTRAINT "student_portfolio_images_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "file_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "student_portfolio_images" ADD CONSTRAINT "student_portfolio_images_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "student_public_profile_drafts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "student_portfolio_images" ADD CONSTRAINT "student_portfolio_images_publishedProfileId_fkey" FOREIGN KEY ("publishedProfileId") REFERENCES "student_public_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
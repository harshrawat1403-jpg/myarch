-- CreateTable
CREATE TABLE "internship_outcomes" (
    "id" UUID NOT NULL,
    "applicationId" UUID NOT NULL,
    "certificateFileId" UUID,
    "companyFeedback" TEXT,
    "studentFeedback" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "internship_outcomes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "internship_outcomes_applicationId_key" ON "internship_outcomes"("applicationId");

-- CreateIndex
CREATE UNIQUE INDEX "internship_outcomes_certificateFileId_key" ON "internship_outcomes"("certificateFileId");

-- AddForeignKey
ALTER TABLE "internship_outcomes" ADD CONSTRAINT "internship_outcomes_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "internship_outcomes" ADD CONSTRAINT "internship_outcomes_certificateFileId_fkey" FOREIGN KEY ("certificateFileId") REFERENCES "file_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

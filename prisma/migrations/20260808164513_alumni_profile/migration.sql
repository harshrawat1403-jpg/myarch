-- CreateTable
CREATE TABLE "alumni_profiles" (
    "id" UUID NOT NULL,
    "studentProfileId" UUID,
    "fullName" TEXT NOT NULL,
    "graduationYear" INTEGER NOT NULL,
    "currentCompany" TEXT,
    "designation" TEXT,
    "location" TEXT,
    "portfolioUrl" TEXT,
    "linkedInUrl" TEXT,
    "mentorshipAvailable" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "alumni_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "alumni_profiles_studentProfileId_key" ON "alumni_profiles"("studentProfileId");

-- CreateIndex
CREATE INDEX "alumni_profiles_graduationYear_idx" ON "alumni_profiles"("graduationYear");

-- AddForeignKey
ALTER TABLE "alumni_profiles" ADD CONSTRAINT "alumni_profiles_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "student_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

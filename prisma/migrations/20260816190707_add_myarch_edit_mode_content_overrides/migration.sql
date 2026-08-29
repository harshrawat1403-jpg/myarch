-- CreateEnum
CREATE TYPE "ContentOverrideType" AS ENUM ('TEXT', 'IMAGE');

-- CreateTable
CREATE TABLE "content_overrides" (
    "id" UUID NOT NULL,
    "page" TEXT NOT NULL,
    "contentKey" TEXT NOT NULL,
    "type" "ContentOverrideType" NOT NULL,
    "textValue" TEXT,
    "fileId" UUID,
    "updatedByUserId" UUID NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "content_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "content_overrides_page_idx" ON "content_overrides"("page");

-- CreateIndex
CREATE UNIQUE INDEX "content_overrides_page_contentKey_key" ON "content_overrides"("page", "contentKey");

-- AddForeignKey
ALTER TABLE "content_overrides" ADD CONSTRAINT "content_overrides_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "file_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_overrides" ADD CONSTRAINT "content_overrides_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

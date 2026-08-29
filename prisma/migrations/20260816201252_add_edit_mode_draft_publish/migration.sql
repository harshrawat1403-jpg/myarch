-- AlterTable
ALTER TABLE "content_overrides" ADD COLUMN     "draftFileId" UUID,
ADD COLUMN     "draftTextValue" TEXT,
ADD COLUMN     "hasDraftChange" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "content_overrides_hasDraftChange_idx" ON "content_overrides"("hasDraftChange");

-- AddForeignKey
ALTER TABLE "content_overrides" ADD CONSTRAINT "content_overrides_draftFileId_fkey" FOREIGN KEY ("draftFileId") REFERENCES "file_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

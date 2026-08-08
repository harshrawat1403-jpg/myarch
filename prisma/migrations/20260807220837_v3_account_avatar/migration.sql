-- AlterTable
ALTER TABLE "users" ADD COLUMN     "avatarFileId" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "users_avatarFileId_key" ON "users"("avatarFileId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_avatarFileId_fkey" FOREIGN KEY ("avatarFileId") REFERENCES "file_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;


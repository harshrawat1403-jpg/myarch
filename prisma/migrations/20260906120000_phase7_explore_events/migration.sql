-- Phase 7: additive public Explore presentation for the existing Event domain.
CREATE TYPE "EventFormKind" AS ENUM ('REGISTRATION', 'VOLUNTEER', 'OTHER');

ALTER TABLE "events"
  ADD COLUMN "slug" TEXT,
  ADD COLUMN "shortDescription" TEXT,
  ADD COLUMN "category" TEXT,
  ADD COLUMN "isPublic" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "featured" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "coverImageFileId" UUID;

-- Existing event identity is preserved. The UUID suffix makes the deterministic
-- backfill collision-free while keeping a readable title-derived prefix.
UPDATE "events"
SET "slug" = CONCAT(
  COALESCE(NULLIF(TRIM(BOTH '-' FROM REGEXP_REPLACE(LOWER("title"), '[^a-z0-9]+', '-', 'g')), ''), 'event'),
  '-', LEFT(REPLACE("id"::text, '-', ''), 8)
)
WHERE "slug" IS NULL;

ALTER TABLE "events" ALTER COLUMN "slug" SET NOT NULL;
CREATE UNIQUE INDEX "events_slug_key" ON "events"("slug");
CREATE INDEX "events_isPublic_startAt_idx" ON "events"("isPublic", "startAt");
CREATE INDEX "events_category_idx" ON "events"("category");
ALTER TABLE "events" ADD CONSTRAINT "events_coverImageFileId_fkey" FOREIGN KEY ("coverImageFileId") REFERENCES "file_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "event_gallery_items" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "eventId" UUID NOT NULL,
  "fileId" UUID NOT NULL,
  "caption" TEXT,
  "displayOrder" INTEGER NOT NULL DEFAULT 0,
  "uploadedByUserId" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "event_gallery_items_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "event_gallery_items_eventId_fileId_key" ON "event_gallery_items"("eventId", "fileId");
CREATE INDEX "event_gallery_items_eventId_displayOrder_idx" ON "event_gallery_items"("eventId", "displayOrder");
ALTER TABLE "event_gallery_items" ADD CONSTRAINT "event_gallery_items_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "event_gallery_items" ADD CONSTRAINT "event_gallery_items_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "file_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "event_gallery_items" ADD CONSTRAINT "event_gallery_items_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "event_forms" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "eventId" UUID NOT NULL,
  "formId" UUID NOT NULL,
  "kind" "EventFormKind" NOT NULL DEFAULT 'OTHER',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "event_forms_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "event_forms_eventId_formId_key" ON "event_forms"("eventId", "formId");
CREATE INDEX "event_forms_formId_idx" ON "event_forms"("formId");
ALTER TABLE "event_forms" ADD CONSTRAINT "event_forms_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "event_forms" ADD CONSTRAINT "event_forms_formId_fkey" FOREIGN KEY ("formId") REFERENCES "forms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "event_announcements" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "eventId" UUID NOT NULL,
  "announcementId" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "event_announcements_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "event_announcements_eventId_announcementId_key" ON "event_announcements"("eventId", "announcementId");
CREATE INDEX "event_announcements_announcementId_idx" ON "event_announcements"("announcementId");
ALTER TABLE "event_announcements" ADD CONSTRAINT "event_announcements_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "event_announcements" ADD CONSTRAINT "event_announcements_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "announcements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

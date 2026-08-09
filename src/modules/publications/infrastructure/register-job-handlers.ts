/**
 * Deliberately its own file, separate from container.ts — importing
 * PublicationExportJobHandler pulls in Playwright, pptxgenjs, and
 * react-dom/server (the whole export-rendering pipeline). container.ts is
 * imported by every route handler in this module for its use-case
 * singletons; if it also imported this file's dependencies, Next.js would
 * bundle that entire Node-only rendering stack into every one of those
 * routes' client/server bundles (confirmed the hard way — a `next build`
 * failure: "Can't resolve 'tls'", Playwright's own Node dependency, showing
 * up in an unrelated route's trace). Only scripts/run-worker.ts ever
 * imports this file, via `registerPublicationJobHandlers()` re-exported
 * from the module barrel — never a side effect of importing
 * `@/modules/publications` for its types/route handlers.
 */
import { prisma } from "@/lib/prisma";
import { saveFile } from "@/lib/file-storage";
import { jobRegistry } from "@/modules/jobs";
import { GENERATE_PUBLICATION_EXPORT_JOB_TYPE } from "../domain/entities";
import { publicationRepository, exportRepository, exportFileRepository, dataLookup } from "./container";
import { PublicationExportJobHandler } from "./publication-export-job-handler";

/** Called once by scripts/run-worker.ts — idempotent, same guard pattern as notifications' registerJobHandlers(). */
export function registerPublicationJobHandlers(): void {
  if (jobRegistry.has(GENERATE_PUBLICATION_EXPORT_JOB_TYPE)) return;
  jobRegistry.register(
    new PublicationExportJobHandler({
      prisma,
      publicationRepository,
      exportRepository,
      exportFileRepository,
      dataLookup,
      saveFile,
    }),
  );
}

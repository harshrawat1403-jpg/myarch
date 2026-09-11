import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth";
import { extractRouteParam } from "@/lib/route-params";
import { forbidden, notFound } from "@/lib/http-errors";
import { NotAuthorizedError } from "@/lib/errors";
import { readFile } from "@/lib/file-storage";
import { getResumeReferenceUseCase } from "../../infrastructure/container";
import { ApprovedProfileNotFoundError, ResumeNotAvailableError } from "../../domain/errors";

/**
 * Returns a reference to the approved public resume (storage key + MIME
 * type), NOT the file bytes themselves — this codebase has no object
 * storage integration wired up yet (docs/architecture/06_Technology_Stack.md's
 * Cloudflare R2 recommendation was never implemented; Days 3–4 established
 * the same "metadata/reference only" precedent for confidential documents).
 * Once real storage exists, this handler is where a signed, time-limited
 * download URL would be generated instead of a bare reference — the
 * authorization and privacy boundary enforced here (approved + PUBLIC
 * classification only) does not change either way.
 */
export const getRecruiterResumeRouteHandler = withAuth(
  async (_req, { actor }, routeContext) => {
    const studentId = await extractRouteParam(routeContext, "id");
    if (!studentId) return notFound("Resume not found");

    try {
      const reference = await getResumeReferenceUseCase.execute({ actor, studentId });
      const bytes = await readFile(reference.storageKey).catch(() => null);
      if (!bytes) return notFound("Resume not found");
      return new NextResponse(bytes as unknown as BodyInit, {
        headers: {
          "Content-Type": reference.mimeType,
          "Content-Disposition": "attachment; filename=resume.pdf",
          "Cache-Control": "private, no-store",
        },
      });
    } catch (err) {
      if (err instanceof ApprovedProfileNotFoundError) return notFound("Profile not found");
      if (err instanceof ResumeNotAvailableError) return notFound(err.message);
      if (err instanceof NotAuthorizedError) return forbidden(err.message);
      throw err;
    }
  },
  { roles: ["RECRUITER"] },
);

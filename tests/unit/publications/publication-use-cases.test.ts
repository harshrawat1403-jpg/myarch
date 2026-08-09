import { beforeEach, describe, expect, it } from "vitest";
import type { AuthenticatedActor } from "../../../src/modules/auth";
import type { PublicationContent, PublicationTemplateRecord } from "../../../src/modules/publications";
import { DEFAULT_STYLE } from "../../../src/modules/publications/client";
import { CreatePublicationUseCase } from "../../../src/modules/publications/application/use-cases/create-publication";
import { UpdatePublicationUseCase } from "../../../src/modules/publications/application/use-cases/update-publication";
import { GetPublicationUseCase } from "../../../src/modules/publications/application/use-cases/get-publication";
import { SearchPublicationsUseCase } from "../../../src/modules/publications/application/use-cases/search-publications";
import { DeletePublicationUseCase } from "../../../src/modules/publications/application/use-cases/delete-publication";
import { PublishPublicationUseCase } from "../../../src/modules/publications/application/use-cases/publish-publication";
import { ListPublicationVersionsUseCase } from "../../../src/modules/publications/application/use-cases/list-publication-versions";
import { RestorePublicationVersionUseCase } from "../../../src/modules/publications/application/use-cases/restore-publication-version";
import { RequestPublicationExportUseCase } from "../../../src/modules/publications/application/use-cases/request-publication-export";
import { ListPublicationExportsUseCase } from "../../../src/modules/publications/application/use-cases/list-publication-exports";
import { GetPublicationExportFileUseCase } from "../../../src/modules/publications/application/use-cases/get-publication-export-file";
import { UploadPublicationImageUseCase } from "../../../src/modules/publications/application/use-cases/upload-publication-image";
import { ListPublicationTemplatesUseCase } from "../../../src/modules/publications/application/use-cases/list-publication-templates";
import { GetPublicationTemplateUseCase } from "../../../src/modules/publications/application/use-cases/get-publication-template";
import { ListSelectableDataUseCase } from "../../../src/modules/publications/application/use-cases/list-selectable-data";
import { GetPreviewDataUseCase } from "../../../src/modules/publications/application/use-cases/get-preview-data";
import {
  InvalidPublicationContentError,
  PublicationExportNotFoundError,
  PublicationNotFoundError,
  PublicationTemplateNotFoundError,
  PublicationVersionConflictError,
  PublicationVersionNotFoundError,
} from "../../../src/modules/publications/domain/errors";
import { NotAuthorizedError } from "../../../src/lib/errors";
import { InMemoryPublicationRepository } from "../../support/fakes/in-memory-publication-repository";
import { InMemoryPublicationTemplateRepository } from "../../support/fakes/in-memory-publication-template-repository";
import { InMemoryPublicationVersionRepository } from "../../support/fakes/in-memory-publication-version-repository";
import { InMemoryPublicationExportRepository } from "../../support/fakes/in-memory-publication-export-repository";
import { FakePublicationDataLookup } from "../../support/fakes/fake-publication-data-lookup";
import {
  InMemoryPublicationExportFileRepository,
  InMemoryPublicationImageFileRepository,
} from "../../support/fakes/in-memory-publication-file-repositories";
import { FakeAuditRecorder } from "../../support/fakes/fake-audit-recorder";
import { FakeJobDispatcher } from "../../support/fakes/fake-job-dispatcher";

const secretary: AuthenticatedActor = { userId: "sec-1", role: "SECRETARY" };
const coordinator: AuthenticatedActor = { userId: "coord-1", role: "COORDINATOR", batchScope: ["batch-a"] };
const student: AuthenticatedActor = { userId: "stu-1", role: "STUDENT", studentProfileId: "s1" };
const recruiter: AuthenticatedActor = { userId: "rec-1", role: "RECRUITER" };

const emptyContent: PublicationContent = { blocks: [], style: DEFAULT_STYLE };

const noneTemplate: PublicationTemplateRecord = {
  id: "tmpl-none",
  name: "Department Brochure",
  type: "BROCHURE",
  description: null,
  thumbnailFileId: null,
  status: "ACTIVE",
  createdByUserId: "sec-1",
  createdAt: new Date(),
  structure: {
    dataBinding: "NONE",
    defaultStyle: DEFAULT_STYLE,
    insertDataBlocksAfterBlockId: null,
    baseBlocks: [{ id: "cover", type: "COVER", visible: true, data: { title: "Department Brochure", subtitle: null, imageFileId: null } }],
  },
};

const studentsTemplate: PublicationTemplateRecord = {
  ...noneTemplate,
  id: "tmpl-students",
  name: "Placement Brochure",
  structure: {
    dataBinding: "STUDENTS",
    defaultStyle: DEFAULT_STYLE,
    insertDataBlocksAfterBlockId: "intro",
    baseBlocks: [
      { id: "cover", type: "COVER", visible: true, data: { title: "Placement Brochure", subtitle: null, imageFileId: null } },
      { id: "intro", type: "TEXT", visible: true, data: { text: "Intro" } },
    ],
  },
};

describe("Publications module use cases (V4.0 E3-E5)", () => {
  let publicationRepository: InMemoryPublicationRepository;
  let templateRepository: InMemoryPublicationTemplateRepository;
  let versionRepository: InMemoryPublicationVersionRepository;
  let exportRepository: InMemoryPublicationExportRepository;
  let dataLookup: FakePublicationDataLookup;
  let imageFileRepository: InMemoryPublicationImageFileRepository;
  let exportFileRepository: InMemoryPublicationExportFileRepository;
  let auditRecorder: FakeAuditRecorder;
  let jobDispatcher: FakeJobDispatcher;

  let createUseCase: CreatePublicationUseCase;
  let updateUseCase: UpdatePublicationUseCase;
  let getUseCase: GetPublicationUseCase;
  let searchUseCase: SearchPublicationsUseCase;
  let deleteUseCase: DeletePublicationUseCase;
  let publishUseCase: PublishPublicationUseCase;
  let listVersionsUseCase: ListPublicationVersionsUseCase;
  let restoreVersionUseCase: RestorePublicationVersionUseCase;
  let requestExportUseCase: RequestPublicationExportUseCase;
  let listExportsUseCase: ListPublicationExportsUseCase;
  let getExportFileUseCase: GetPublicationExportFileUseCase;
  let uploadImageUseCase: UploadPublicationImageUseCase;
  let listTemplatesUseCase: ListPublicationTemplatesUseCase;
  let getTemplateUseCase: GetPublicationTemplateUseCase;
  let listSelectableDataUseCase: ListSelectableDataUseCase;
  let getPreviewDataUseCase: GetPreviewDataUseCase;

  beforeEach(() => {
    publicationRepository = new InMemoryPublicationRepository();
    templateRepository = new InMemoryPublicationTemplateRepository();
    templateRepository.seed(noneTemplate);
    templateRepository.seed(studentsTemplate);
    versionRepository = new InMemoryPublicationVersionRepository();
    exportRepository = new InMemoryPublicationExportRepository();
    dataLookup = new FakePublicationDataLookup();
    imageFileRepository = new InMemoryPublicationImageFileRepository();
    exportFileRepository = new InMemoryPublicationExportFileRepository();
    auditRecorder = new FakeAuditRecorder();
    jobDispatcher = new FakeJobDispatcher();

    createUseCase = new CreatePublicationUseCase({ publicationRepository, templateRepository, auditRecorder });
    updateUseCase = new UpdatePublicationUseCase({ publicationRepository, auditRecorder });
    getUseCase = new GetPublicationUseCase({ publicationRepository });
    searchUseCase = new SearchPublicationsUseCase({ publicationRepository });
    deleteUseCase = new DeletePublicationUseCase({ publicationRepository, auditRecorder });
    publishUseCase = new PublishPublicationUseCase({ publicationRepository, versionRepository, auditRecorder });
    listVersionsUseCase = new ListPublicationVersionsUseCase({ publicationRepository, versionRepository });
    restoreVersionUseCase = new RestorePublicationVersionUseCase({ publicationRepository, versionRepository, auditRecorder });
    requestExportUseCase = new RequestPublicationExportUseCase({ publicationRepository, exportRepository, jobDispatcher, auditRecorder });
    listExportsUseCase = new ListPublicationExportsUseCase({ publicationRepository, exportRepository });
    getExportFileUseCase = new GetPublicationExportFileUseCase({ exportRepository, exportFileRepository });
    uploadImageUseCase = new UploadPublicationImageUseCase({ imageFileRepository, saveFile: async () => {} });
    listTemplatesUseCase = new ListPublicationTemplatesUseCase({ templateRepository });
    getTemplateUseCase = new GetPublicationTemplateUseCase({ templateRepository });
    listSelectableDataUseCase = new ListSelectableDataUseCase({ dataLookup });
    getPreviewDataUseCase = new GetPreviewDataUseCase({ dataLookup });
  });

  describe("CreatePublicationUseCase", () => {
    it("creates a DRAFT publication from a NONE-binding template for a Secretary", async () => {
      const pub = await createUseCase.execute({ actor: secretary, title: "Dept Brochure 2026", templateId: noneTemplate.id, pageSize: "A4_PORTRAIT" });
      expect(pub.status).toBe("DRAFT");
      expect(pub.type).toBe("BROCHURE");
      expect(pub.version).toBe(1);
      expect(pub.content.blocks).toHaveLength(1);
    });

    it("creates a publication for a Coordinator — identical authority to Secretary", async () => {
      const pub = await createUseCase.execute({ actor: coordinator, title: "Dept Brochure", templateId: noneTemplate.id, pageSize: "A4_PORTRAIT" });
      expect(pub.createdByUserId).toBe("coord-1");
    });

    it("splices auto-populated STUDENT_PROFILE blocks for selected ids, never copying data", async () => {
      const pub = await createUseCase.execute({
        actor: secretary,
        title: "Placement Brochure 2026",
        templateId: studentsTemplate.id,
        pageSize: "A4_PORTRAIT",
        selectedIds: ["student-1", "student-2"],
      });
      const studentBlocks = pub.content.blocks.filter((b) => b.type === "STUDENT_PROFILE");
      expect(studentBlocks).toHaveLength(2);
      expect(studentBlocks.map((b) => (b as { data: { studentProfileId: string } }).data.studentProfileId)).toEqual(["student-1", "student-2"]);
      // spliced immediately after "intro"
      const introIndex = pub.content.blocks.findIndex((b) => b.id === "intro");
      expect(pub.content.blocks[introIndex + 1]?.type).toBe("STUDENT_PROFILE");
    });

    it("denies a Student and a Recruiter", async () => {
      await expect(
        createUseCase.execute({ actor: student, title: "x", templateId: noneTemplate.id, pageSize: "A4_PORTRAIT" }),
      ).rejects.toBeInstanceOf(NotAuthorizedError);
      await expect(
        createUseCase.execute({ actor: recruiter, title: "x", templateId: noneTemplate.id, pageSize: "A4_PORTRAIT" }),
      ).rejects.toBeInstanceOf(NotAuthorizedError);
    });

    it("throws PublicationTemplateNotFoundError for an unknown template", async () => {
      await expect(
        createUseCase.execute({ actor: secretary, title: "x", templateId: "unknown", pageSize: "A4_PORTRAIT" }),
      ).rejects.toBeInstanceOf(PublicationTemplateNotFoundError);
    });

    it("records a PUBLICATION_CREATED audit entry", async () => {
      const pub = await createUseCase.execute({ actor: secretary, title: "Dept Brochure", templateId: noneTemplate.id, pageSize: "A4_PORTRAIT" });
      expect(auditRecorder.entries[0]).toMatchObject({ action: "PUBLICATION_CREATED", targetEntityId: pub.id });
    });
  });

  describe("UpdatePublicationUseCase (optimistic locking, §13.4)", () => {
    it("saves a content edit and bumps the version for a Coordinator", async () => {
      const pub = await createUseCase.execute({ actor: secretary, title: "Dept Brochure", templateId: noneTemplate.id, pageSize: "A4_PORTRAIT" });
      const updated = await updateUseCase.execute({
        actor: coordinator,
        publicationId: pub.id,
        title: "Updated Title",
        content: emptyContent,
        pageSize: "A4_PORTRAIT",
        expectedVersion: pub.version,
      });
      expect(updated.title).toBe("Updated Title");
      expect(updated.version).toBe(pub.version + 1);
    });

    it("throws PublicationVersionConflictError when expectedVersion is stale", async () => {
      const pub = await createUseCase.execute({ actor: secretary, title: "Dept Brochure", templateId: noneTemplate.id, pageSize: "A4_PORTRAIT" });
      await updateUseCase.execute({ actor: secretary, publicationId: pub.id, title: "First edit", content: emptyContent, pageSize: "A4_PORTRAIT", expectedVersion: pub.version });

      await expect(
        updateUseCase.execute({ actor: secretary, publicationId: pub.id, title: "Stale edit", content: emptyContent, pageSize: "A4_PORTRAIT", expectedVersion: pub.version }),
      ).rejects.toBeInstanceOf(PublicationVersionConflictError);
    });

    it("denies a Recruiter", async () => {
      const pub = await createUseCase.execute({ actor: secretary, title: "Dept Brochure", templateId: noneTemplate.id, pageSize: "A4_PORTRAIT" });
      await expect(
        updateUseCase.execute({ actor: recruiter, publicationId: pub.id, title: "x", content: emptyContent, pageSize: "A4_PORTRAIT", expectedVersion: pub.version }),
      ).rejects.toBeInstanceOf(NotAuthorizedError);
    });

    it("throws PublicationNotFoundError for an unknown id", async () => {
      await expect(
        updateUseCase.execute({ actor: secretary, publicationId: "unknown", title: "x", content: emptyContent, pageSize: "A4_PORTRAIT", expectedVersion: 1 }),
      ).rejects.toBeInstanceOf(PublicationNotFoundError);
    });
  });

  describe("GetPublicationUseCase / SearchPublicationsUseCase / DeletePublicationUseCase", () => {
    it("gets and searches for a Coordinator, denies a Student", async () => {
      const pub = await createUseCase.execute({ actor: secretary, title: "Dept Brochure", templateId: noneTemplate.id, pageSize: "A4_PORTRAIT" });

      const got = await getUseCase.execute(coordinator, pub.id);
      expect(got.id).toBe(pub.id);

      const results = await searchUseCase.execute(coordinator, {});
      expect(results.map((r) => r.id)).toContain(pub.id);

      await expect(getUseCase.execute(student, pub.id)).rejects.toBeInstanceOf(NotAuthorizedError);
      await expect(searchUseCase.execute(student, {})).rejects.toBeInstanceOf(NotAuthorizedError);
    });

    it("throws PublicationNotFoundError from GetPublicationUseCase for an unknown id", async () => {
      await expect(getUseCase.execute(secretary, "unknown")).rejects.toBeInstanceOf(PublicationNotFoundError);
    });

    it("deletes for a Secretary, records an audit entry, and 404s afterward", async () => {
      const pub = await createUseCase.execute({ actor: secretary, title: "Dept Brochure", templateId: noneTemplate.id, pageSize: "A4_PORTRAIT" });
      await deleteUseCase.execute(secretary, pub.id);
      expect(await publicationRepository.findById(pub.id)).toBeNull();
      expect(auditRecorder.entries.some((e) => e.action === "PUBLICATION_DELETED" && e.targetEntityId === pub.id)).toBe(true);
    });

    it("denies delete for a Recruiter and 404s for an unknown id", async () => {
      const pub = await createUseCase.execute({ actor: secretary, title: "Dept Brochure", templateId: noneTemplate.id, pageSize: "A4_PORTRAIT" });
      await expect(deleteUseCase.execute(recruiter, pub.id)).rejects.toBeInstanceOf(NotAuthorizedError);
      await expect(deleteUseCase.execute(secretary, "unknown")).rejects.toBeInstanceOf(PublicationNotFoundError);
    });
  });

  describe("PublishPublicationUseCase (§13.1 step 5, §13.4)", () => {
    it("flips status to PUBLISHED and appends a version snapshot", async () => {
      const pub = await createUseCase.execute({ actor: secretary, title: "Dept Brochure", templateId: noneTemplate.id, pageSize: "A4_PORTRAIT" });
      const published = await publishUseCase.execute(secretary, pub.id, "Initial release");
      expect(published.status).toBe("PUBLISHED");

      const versions = await versionRepository.listForPublication(pub.id);
      expect(versions).toHaveLength(1);
      expect(versions[0]?.label).toBe("Initial release");
      expect(versions[0]?.versionNumber).toBe(1);
    });

    it("publishing again after further edits creates the next version, does not error on an already-published publication", async () => {
      const pub = await createUseCase.execute({ actor: secretary, title: "Dept Brochure", templateId: noneTemplate.id, pageSize: "A4_PORTRAIT" });
      await publishUseCase.execute(secretary, pub.id);
      await updateUseCase.execute({ actor: secretary, publicationId: pub.id, title: "Edited", content: emptyContent, pageSize: "A4_PORTRAIT", expectedVersion: 1 });
      await publishUseCase.execute(secretary, pub.id);

      const versions = await versionRepository.listForPublication(pub.id);
      expect(versions.map((v) => v.versionNumber)).toEqual([1, 2]);
    });

    it("blocks publishing an ARCHIVED publication", async () => {
      const pub = await createUseCase.execute({ actor: secretary, title: "Dept Brochure", templateId: noneTemplate.id, pageSize: "A4_PORTRAIT" });
      await publicationRepository.setStatus(pub.id, "ARCHIVED");
      await expect(publishUseCase.execute(secretary, pub.id)).rejects.toBeInstanceOf(InvalidPublicationContentError);
    });

    it("denies a Recruiter", async () => {
      const pub = await createUseCase.execute({ actor: secretary, title: "Dept Brochure", templateId: noneTemplate.id, pageSize: "A4_PORTRAIT" });
      await expect(publishUseCase.execute(recruiter, pub.id)).rejects.toBeInstanceOf(NotAuthorizedError);
    });
  });

  describe("ListPublicationVersionsUseCase / RestorePublicationVersionUseCase (§13.4 — restore creates a new draft state, does not rewrite history)", () => {
    it("restores an old snapshot as a new content save, leaving status untouched", async () => {
      const pub = await createUseCase.execute({ actor: secretary, title: "Dept Brochure", templateId: noneTemplate.id, pageSize: "A4_PORTRAIT" });
      await publishUseCase.execute(secretary, pub.id, "v1");
      const afterEdit = await updateUseCase.execute({ actor: secretary, publicationId: pub.id, title: "Edited Title", content: emptyContent, pageSize: "A4_PORTRAIT", expectedVersion: 1 });
      expect(afterEdit.status).toBe("PUBLISHED");

      const restored = await restoreVersionUseCase.execute(secretary, pub.id, 1);
      expect(restored.title).toBe("Edited Title"); // only content is restored from the snapshot — title stays as the current draft's
      expect(restored.status).toBe("PUBLISHED"); // status untouched by restore
      expect(restored.version).toBe(afterEdit.version + 1);

      const listed = await listVersionsUseCase.execute(coordinator, pub.id);
      expect(listed).toHaveLength(1);
    });

    it("throws PublicationVersionNotFoundError for an unknown version number", async () => {
      const pub = await createUseCase.execute({ actor: secretary, title: "Dept Brochure", templateId: noneTemplate.id, pageSize: "A4_PORTRAIT" });
      await expect(restoreVersionUseCase.execute(secretary, pub.id, 99)).rejects.toBeInstanceOf(PublicationVersionNotFoundError);
    });

    it("denies a Student from listing or restoring versions", async () => {
      const pub = await createUseCase.execute({ actor: secretary, title: "Dept Brochure", templateId: noneTemplate.id, pageSize: "A4_PORTRAIT" });
      await publishUseCase.execute(secretary, pub.id);
      await expect(listVersionsUseCase.execute(student, pub.id)).rejects.toBeInstanceOf(NotAuthorizedError);
      await expect(restoreVersionUseCase.execute(student, pub.id, 1)).rejects.toBeInstanceOf(NotAuthorizedError);
    });
  });

  describe("RequestPublicationExportUseCase / ListPublicationExportsUseCase / GetPublicationExportFileUseCase (§13.4/§19 — job-dispatched, never inline)", () => {
    it("creates a PENDING export record and dispatches a background job rather than rendering inline", async () => {
      const pub = await createUseCase.execute({ actor: secretary, title: "Dept Brochure", templateId: noneTemplate.id, pageSize: "A4_PORTRAIT" });
      const exportRecord = await requestExportUseCase.execute(secretary, pub.id, "PDF");
      expect(exportRecord.status).toBe("PENDING");
      expect(exportRecord.format).toBe("PDF");

      expect(jobDispatcher.dispatched).toHaveLength(1);
      expect(jobDispatcher.dispatched[0]).toMatchObject({
        type: "GENERATE_PUBLICATION_EXPORT",
        payload: { exportId: exportRecord.id, publicationId: pub.id, format: "PDF" },
      });

      const listed = await listExportsUseCase.execute(coordinator, pub.id);
      expect(listed.map((e) => e.id)).toEqual([exportRecord.id]);
    });

    it("resolves the file only once the export is READY", async () => {
      const pub = await createUseCase.execute({ actor: secretary, title: "Dept Brochure", templateId: noneTemplate.id, pageSize: "A4_PORTRAIT" });
      const exportRecord = await requestExportUseCase.execute(secretary, pub.id, "PDF");

      await expect(getExportFileUseCase.execute(secretary, exportRecord.id)).rejects.toBeInstanceOf(PublicationExportNotFoundError);

      const file = await exportFileRepository.create({ ownerUserId: "sec-1", storageKey: "publications/exports/x.pdf", mimeType: "application/pdf", sizeBytes: 100 });
      await exportRepository.markReady(exportRecord.id, file.id);

      const resolved = await getExportFileUseCase.execute(secretary, exportRecord.id);
      expect(resolved.id).toBe(file.id);
    });

    it("denies a Student from requesting or listing exports", async () => {
      const pub = await createUseCase.execute({ actor: secretary, title: "Dept Brochure", templateId: noneTemplate.id, pageSize: "A4_PORTRAIT" });
      await expect(requestExportUseCase.execute(student, pub.id, "PDF")).rejects.toBeInstanceOf(NotAuthorizedError);
      await expect(listExportsUseCase.execute(student, pub.id)).rejects.toBeInstanceOf(NotAuthorizedError);
    });
  });

  describe("UploadPublicationImageUseCase", () => {
    it("accepts a JPEG within the size limit for a Secretary", async () => {
      const result = await uploadImageUseCase.execute({ actor: secretary, data: Buffer.from("fake-image-bytes"), mimeType: "image/jpeg", sizeBytes: 1024 });
      expect(result.fileId).toBeTruthy();
      expect(await imageFileRepository.findById(result.fileId)).not.toBeNull();
    });

    it("rejects a disallowed mime type", async () => {
      await expect(
        uploadImageUseCase.execute({ actor: secretary, data: Buffer.from("x"), mimeType: "application/pdf", sizeBytes: 1024 }),
      ).rejects.toBeInstanceOf(InvalidPublicationContentError);
    });

    it("rejects an oversized image", async () => {
      await expect(
        uploadImageUseCase.execute({ actor: secretary, data: Buffer.from("x"), mimeType: "image/png", sizeBytes: 9 * 1024 * 1024 }),
      ).rejects.toBeInstanceOf(InvalidPublicationContentError);
    });

    it("denies a Recruiter", async () => {
      await expect(
        uploadImageUseCase.execute({ actor: recruiter, data: Buffer.from("x"), mimeType: "image/png", sizeBytes: 1024 }),
      ).rejects.toBeInstanceOf(NotAuthorizedError);
    });
  });

  describe("ListPublicationTemplatesUseCase / GetPublicationTemplateUseCase", () => {
    it("lists only ACTIVE templates, optionally filtered by type", async () => {
      const results = await listTemplatesUseCase.execute(secretary, "BROCHURE");
      expect(results.map((t) => t.id).sort()).toEqual([noneTemplate.id, studentsTemplate.id].sort());
    });

    it("gets a single template and 404s for an unknown id", async () => {
      const got = await getTemplateUseCase.execute(coordinator, noneTemplate.id);
      expect(got.name).toBe("Department Brochure");
      await expect(getTemplateUseCase.execute(secretary, "unknown")).rejects.toBeInstanceOf(PublicationTemplateNotFoundError);
    });

    it("denies a Student and a Recruiter", async () => {
      await expect(listTemplatesUseCase.execute(student)).rejects.toBeInstanceOf(NotAuthorizedError);
      await expect(getTemplateUseCase.execute(recruiter, noneTemplate.id)).rejects.toBeInstanceOf(NotAuthorizedError);
    });
  });

  describe("ListSelectableDataUseCase / GetPreviewDataUseCase (never fabricated — real platform data only)", () => {
    beforeEach(() => {
      dataLookup.students = [{ studentProfileId: "student-1", fullName: "Priya Iyer", batchId: "batch-a", batchName: "2026" }];
      dataLookup.resolvedStudents = [
        { studentProfileId: "student-1", fullName: "Priya Iyer", batchName: "2026", bio: null, skills: ["React"], software: [], portfolioLinks: [], photoFileId: null },
      ];
    });

    it("returns selectable students for the STUDENTS binding kind", async () => {
      const result = await listSelectableDataUseCase.execute(secretary, "STUDENTS");
      expect(result).toEqual({ kind: "STUDENTS", options: dataLookup.students });
    });

    it("returns an empty option list for NONE/STATS binding kinds", async () => {
      const none = await listSelectableDataUseCase.execute(secretary, "NONE");
      expect(none).toEqual({ kind: "NONE", options: [] });
    });

    it("resolves live data for a preview from the actor's in-memory content, not from a saved publication", async () => {
      const content: PublicationContent = {
        blocks: [{ id: "b1", type: "STUDENT_PROFILE", visible: true, data: { studentProfileId: "student-1" } }],
        style: DEFAULT_STYLE,
      };
      const resolved = await getPreviewDataUseCase.execute(secretary, content);
      expect(resolved.students["student-1"]?.fullName).toBe("Priya Iyer");
    });

    it("denies a Student from either use case", async () => {
      await expect(listSelectableDataUseCase.execute(student, "STUDENTS")).rejects.toBeInstanceOf(NotAuthorizedError);
      await expect(getPreviewDataUseCase.execute(student, emptyContent)).rejects.toBeInstanceOf(NotAuthorizedError);
    });
  });
});

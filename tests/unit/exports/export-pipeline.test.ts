/**
 * End-to-end (within this process — no HTTP/Prisma layer, consistent with
 * every prior phase's no-live-database constraint) exercise of the full
 * pipeline a route handler runs: use case → toCsv → the exact column specs
 * production code uses. Validates real CSV content, not just the
 * formatter or the use case in isolation.
 */
import { describe, expect, it } from "vitest";
import type { AuthenticatedActor } from "../../../src/modules/auth";
import { toCsv, buildCsvFilename } from "../../../src/lib/csv";
import {
  BATCH_REPORT_COLUMNS,
  PUBLIC_PLACEMENT_COLUMNS,
  RECRUITER_DIRECTORY_COLUMNS,
  STUDENT_DIRECTORY_COLUMNS,
} from "../../../src/modules/exports/presentation/columns";
import { GenerateStudentDirectoryExportUseCase } from "../../../src/modules/exports/application/use-cases/generate-student-directory-export";
import { GenerateBatchReportExportUseCase } from "../../../src/modules/exports/application/use-cases/generate-batch-report-export";
import { GeneratePublicPlacementExportUseCase } from "../../../src/modules/exports/application/use-cases/generate-public-placement-export";
import { GenerateRecruiterDirectoryExportUseCase } from "../../../src/modules/exports/application/use-cases/generate-recruiter-directory-export";
import {
  InMemoryBatchReportExportRepository,
  InMemoryPublicPlacementExportRepository,
  InMemoryRecruiterDirectoryExportRepository,
  InMemoryStudentDirectoryExportRepository,
} from "../../support/fakes/in-memory-export-repositories";

const secretary: AuthenticatedActor = { userId: "sec-1", role: "SECRETARY" };

describe("Student Directory export — full pipeline", () => {
  it("produces correct CSV content, including a comma-containing field", async () => {
    const repo = new InMemoryStudentDirectoryExportRepository();
    repo.seed({
      batchId: "batch-a",
      fullName: "Doe, Alice",
      rollNumber: "BA001",
      batchName: "B.Arch 2026",
      instituteEmail: "alice@vnit.ac.in",
      skills: ["Rendering", "Modeling"],
      software: ["Rhino"],
      resumeAvailable: true,
      portfolioAvailable: false,
      activeStatus: true,
    });
    const useCase = new GenerateStudentDirectoryExportUseCase({ repository: repo });

    const rows = await useCase.execute({ actor: secretary });
    const csv = toCsv(rows, STUDENT_DIRECTORY_COLUMNS);

    expect(csv).toBe(
      "Name,Roll Number,Batch,Institute Email,Skills,Software,Resume Available,Portfolio Available,Active Status\r\n" +
        '"Doe, Alice",BA001,B.Arch 2026,alice@vnit.ac.in,Rendering; Modeling,Rhino,Yes,No,Active\r\n',
    );
  });

  it("produces only the header row when nothing is exportable", async () => {
    const repo = new InMemoryStudentDirectoryExportRepository();
    const useCase = new GenerateStudentDirectoryExportUseCase({ repository: repo });
    const rows = await useCase.execute({ actor: secretary });
    const csv = toCsv(rows, STUDENT_DIRECTORY_COLUMNS);
    expect(csv).toBe(
      "Name,Roll Number,Batch,Institute Email,Skills,Software,Resume Available,Portfolio Available,Active Status\r\n",
    );
  });

  it("produces the expected filename", () => {
    expect(buildCsvFilename("student-directory", new Date("2026-08-05"))).toBe("student-directory-2026-08-05.csv");
  });
});

describe("Batch Report export — full pipeline", () => {
  it("produces correct CSV content", async () => {
    const repo = new InMemoryBatchReportExportRepository();
    repo.seed({ batchId: "batch-a", batchName: "B.Arch 2026", status: "ACTIVE", totalStudents: 10, activeStudents: 9, archivedStudents: 1 });
    const useCase = new GenerateBatchReportExportUseCase({ repository: repo });

    const rows = await useCase.execute({ actor: secretary });
    const csv = toCsv(rows, BATCH_REPORT_COLUMNS);

    expect(csv).toBe(
      "Batch Name,Status,Total Students,Active Students,Archived Students\r\nB.Arch 2026,ACTIVE,10,9,1\r\n",
    );
  });
});

describe("Public Placement Dataset export — full pipeline", () => {
  it("produces correct CSV content with flattened arrays", async () => {
    const repo = new InMemoryPublicPlacementExportRepository();
    repo.seed({
      batchId: "batch-a",
      fullName: "Alice Architect",
      batchName: "B.Arch 2026",
      bio: "Aspiring architect",
      skills: ["Rendering"],
      software: ["Rhino", "Revit"],
      certifications: ["LEED Green Associate"],
      internshipExperience: ["Studio X"],
      portfolioLinks: ["https://alice.design"],
      resumeAvailable: true,
    });
    const useCase = new GeneratePublicPlacementExportUseCase({ repository: repo });

    const rows = await useCase.execute({ actor: secretary });
    const csv = toCsv(rows, PUBLIC_PLACEMENT_COLUMNS);

    expect(csv).toBe(
      "Name,Batch,Bio,Skills,Software,Certifications,Internship Experience,Portfolio Links,Resume Available\r\n" +
        "Alice Architect,B.Arch 2026,Aspiring architect,Rendering,Rhino; Revit,LEED Green Associate,Studio X,https://alice.design,Yes\r\n",
    );
  });
});

describe("Recruiter Directory export — full pipeline", () => {
  it("produces correct CSV content with Active Drives always 0", async () => {
    const repo = new InMemoryRecruiterDirectoryExportRepository();
    repo.seed({ company: "Studio Example", contactPerson: "Jordan Recruiter", officialEmail: "jordan@studio-example.com", activeDrives: 0 });
    const useCase = new GenerateRecruiterDirectoryExportUseCase({ repository: repo });

    const rows = await useCase.execute({ actor: secretary });
    const csv = toCsv(rows, RECRUITER_DIRECTORY_COLUMNS);

    expect(csv).toBe(
      "Company,Contact Person,Official Email,Active Drives\r\nStudio Example,Jordan Recruiter,jordan@studio-example.com,0\r\n",
    );
  });
});

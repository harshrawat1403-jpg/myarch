import { joinForCsv, type ExportColumn } from "@/lib/csv";
import type {
  BatchReportRow,
  PublicPlacementRow,
  RecruiterDirectoryRow,
  StudentDirectoryRow,
} from "../domain/entities";

/**
 * Column specs, one array per export, imported by both the route handlers
 * (to build the actual CSV) and the test suite (to assert the exact header
 * row a request produces) — kept in one place so a test can never silently
 * drift from what production code actually sends.
 */

export const STUDENT_DIRECTORY_COLUMNS: readonly ExportColumn<StudentDirectoryRow>[] = [
  { header: "Name", value: (row) => row.fullName },
  { header: "Roll Number", value: (row) => row.rollNumber },
  { header: "Batch", value: (row) => row.batchName },
  { header: "Institute Email", value: (row) => row.instituteEmail },
  { header: "Skills", value: (row) => joinForCsv(row.skills) },
  { header: "Software", value: (row) => joinForCsv(row.software) },
  { header: "Resume Available", value: (row) => (row.resumeAvailable ? "Yes" : "No") },
  { header: "Portfolio Available", value: (row) => (row.portfolioAvailable ? "Yes" : "No") },
  { header: "Active Status", value: (row) => (row.activeStatus ? "Active" : "Archived") },
];

export const BATCH_REPORT_COLUMNS: readonly ExportColumn<BatchReportRow>[] = [
  { header: "Batch Name", value: (row) => row.batchName },
  { header: "Status", value: (row) => row.status },
  { header: "Total Students", value: (row) => String(row.totalStudents) },
  { header: "Active Students", value: (row) => String(row.activeStudents) },
  { header: "Archived Students", value: (row) => String(row.archivedStudents) },
];

export const PUBLIC_PLACEMENT_COLUMNS: readonly ExportColumn<PublicPlacementRow>[] = [
  { header: "Name", value: (row) => row.fullName },
  { header: "Batch", value: (row) => row.batchName },
  { header: "Bio", value: (row) => row.bio ?? "" },
  { header: "Skills", value: (row) => joinForCsv(row.skills) },
  { header: "Software", value: (row) => joinForCsv(row.software) },
  { header: "Certifications", value: (row) => joinForCsv(row.certifications) },
  { header: "Internship Experience", value: (row) => joinForCsv(row.internshipExperience) },
  { header: "Portfolio Links", value: (row) => joinForCsv(row.portfolioLinks) },
  { header: "Resume Available", value: (row) => (row.resumeAvailable ? "Yes" : "No") },
];

export const RECRUITER_DIRECTORY_COLUMNS: readonly ExportColumn<RecruiterDirectoryRow>[] = [
  { header: "Company", value: (row) => row.company },
  { header: "Contact Person", value: (row) => row.contactPerson },
  { header: "Official Email", value: (row) => row.officialEmail },
  { header: "Active Drives", value: (row) => String(row.activeDrives) },
];

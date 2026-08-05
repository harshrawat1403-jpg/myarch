/**
 * Locks the exact CSV header names against Day 10's required field lists —
 * imports the SAME column definitions the route handlers actually use
 * (src/modules/exports/presentation/columns.ts), so this test can never
 * silently drift from production behavior.
 */
import { describe, expect, it } from "vitest";
import {
  BATCH_REPORT_COLUMNS,
  PUBLIC_PLACEMENT_COLUMNS,
  RECRUITER_DIRECTORY_COLUMNS,
  STUDENT_DIRECTORY_COLUMNS,
} from "../../../src/modules/exports/presentation/columns";

function headers(columns: readonly { header: string }[]): string[] {
  return columns.map((c) => c.header);
}

describe("Student Directory export — required headers, in order", () => {
  it("matches the required field list exactly", () => {
    expect(headers(STUDENT_DIRECTORY_COLUMNS)).toEqual([
      "Name",
      "Roll Number",
      "Batch",
      "Institute Email",
      "Skills",
      "Software",
      "Resume Available",
      "Portfolio Available",
      "Active Status",
    ]);
  });

  it("never includes a forbidden column (Password, Hashes, CGPA, Backlogs, Personal Email, Phone, Internal Remarks, Confidential Documents)", () => {
    const columnHeaders = headers(STUDENT_DIRECTORY_COLUMNS).join(" ").toLowerCase();
    for (const forbidden of ["password", "hash", "cgpa", "backlog", "personal email", "phone", "remark", "confidential"]) {
      expect(columnHeaders).not.toContain(forbidden);
    }
  });
});

describe("Batch Report export — required headers, in order", () => {
  it("matches the required field list exactly", () => {
    expect(headers(BATCH_REPORT_COLUMNS)).toEqual([
      "Batch Name",
      "Status",
      "Total Students",
      "Active Students",
      "Archived Students",
    ]);
  });
});

describe("Public Placement Dataset export — required headers, in order", () => {
  it("matches the required field list exactly", () => {
    expect(headers(PUBLIC_PLACEMENT_COLUMNS)).toEqual([
      "Name",
      "Batch",
      "Bio",
      "Skills",
      "Software",
      "Certifications",
      "Internship Experience",
      "Portfolio Links",
      "Resume Available",
    ]);
  });

  it("never includes a draft/approval-status/private column", () => {
    const columnHeaders = headers(PUBLIC_PLACEMENT_COLUMNS).join(" ").toLowerCase();
    for (const forbidden of ["draft", "status", "approv", "cgpa", "remark", "phone", "email"]) {
      expect(columnHeaders).not.toContain(forbidden);
    }
  });
});

describe("Recruiter Directory export — required headers, in order", () => {
  it("matches the required field list exactly", () => {
    expect(headers(RECRUITER_DIRECTORY_COLUMNS)).toEqual([
      "Company",
      "Contact Person",
      "Official Email",
      "Active Drives",
    ]);
  });
});

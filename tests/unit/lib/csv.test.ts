import { describe, expect, it } from "vitest";
import { buildCsvFilename, joinForCsv, toCsv, type ExportColumn } from "../../../src/lib/csv";

interface Row {
  name: string;
  note: string;
}

const COLUMNS: readonly ExportColumn<Row>[] = [
  { header: "Name", value: (row) => row.name },
  { header: "Note", value: (row) => row.note },
];

describe("toCsv", () => {
  it("produces a header row followed by one data row per input, CRLF-terminated", () => {
    const csv = toCsv<Row>([{ name: "Alice", note: "ok" }], COLUMNS);
    expect(csv).toBe("Name,Note\r\nAlice,ok\r\n");
  });

  it("produces only the header row for an empty export", () => {
    const csv = toCsv<Row>([], COLUMNS);
    expect(csv).toBe("Name,Note\r\n");
  });

  it("quotes a field containing a comma", () => {
    const csv = toCsv<Row>([{ name: "Doe, Jane", note: "ok" }], COLUMNS);
    expect(csv).toContain('"Doe, Jane"');
  });

  it("quotes a field containing a double quote, doubling the embedded quote", () => {
    const csv = toCsv<Row>([{ name: 'Say "hi"', note: "ok" }], COLUMNS);
    expect(csv).toContain('"Say ""hi"""');
  });

  it("quotes a field containing a newline", () => {
    const csv = toCsv<Row>([{ name: "Alice", note: "line1\nline2" }], COLUMNS);
    expect(csv).toContain('"line1\nline2"');
  });

  it("does not quote a plain field", () => {
    const csv = toCsv<Row>([{ name: "Alice", note: "ok" }], COLUMNS);
    expect(csv).not.toContain('"Alice"');
  });

  it("renders multiple rows in the order given", () => {
    const csv = toCsv<Row>(
      [
        { name: "Alice", note: "a" },
        { name: "Bob", note: "b" },
      ],
      COLUMNS,
    );
    expect(csv).toBe("Name,Note\r\nAlice,a\r\nBob,b\r\n");
  });
});

describe("joinForCsv", () => {
  it("joins multiple values with a semicolon-space separator", () => {
    expect(joinForCsv(["Rhino", "Revit"])).toBe("Rhino; Revit");
  });

  it("returns an empty string for an empty array", () => {
    expect(joinForCsv([])).toBe("");
  });
});

describe("buildCsvFilename", () => {
  it("builds a <prefix>-YYYY-MM-DD.csv filename from a given date", () => {
    const filename = buildCsvFilename("student-directory", new Date("2026-08-05T12:00:00.000Z"));
    expect(filename).toBe("student-directory-2026-08-05.csv");
  });

  it("defaults to the current date when none is provided", () => {
    const filename = buildCsvFilename("batch-report");
    expect(filename).toMatch(/^batch-report-\d{4}-\d{2}-\d{2}\.csv$/);
  });
});

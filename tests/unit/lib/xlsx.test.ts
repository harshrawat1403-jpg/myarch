import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import type { ExportColumn } from "../../../src/lib/csv";
import { buildXlsxFilename, toXlsx } from "../../../src/lib/xlsx";

interface Row {
  name: string;
  note: string;
}

const COLUMNS: readonly ExportColumn<Row>[] = [
  { header: "Name", value: (row) => row.name },
  { header: "Note", value: (row) => row.note },
];

async function readBack(buffer: Buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
  return workbook.worksheets[0]!;
}

describe("toXlsx", () => {
  it("produces a real, readable workbook with a header row and one data row per input", async () => {
    const buffer = await toXlsx<Row>([{ name: "Alice", note: "ok" }], COLUMNS, "My Sheet");
    const sheet = await readBack(buffer);
    expect(sheet.name).toBe("My Sheet");
    expect(sheet.getRow(1).getCell(1).value).toBe("Name");
    expect(sheet.getRow(1).getCell(2).value).toBe("Note");
    expect(sheet.getRow(2).getCell(1).value).toBe("Alice");
    expect(sheet.getRow(2).getCell(2).value).toBe("ok");
  });

  it("bolds the header row", async () => {
    const buffer = await toXlsx<Row>([], COLUMNS);
    const sheet = await readBack(buffer);
    expect(sheet.getRow(1).font?.bold).toBe(true);
  });

  it("produces only a header row for an empty export", async () => {
    const buffer = await toXlsx<Row>([], COLUMNS);
    const sheet = await readBack(buffer);
    expect(sheet.rowCount).toBe(1);
  });

  it("renders multiple rows in the order given", async () => {
    const buffer = await toXlsx<Row>(
      [
        { name: "Alice", note: "a" },
        { name: "Bob", note: "b" },
      ],
      COLUMNS,
    );
    const sheet = await readBack(buffer);
    expect(sheet.getRow(2).getCell(1).value).toBe("Alice");
    expect(sheet.getRow(3).getCell(1).value).toBe("Bob");
  });

  it("truncates a sheet name to Excel's 31-character limit", async () => {
    const buffer = await toXlsx<Row>([], COLUMNS, "A".repeat(50));
    const sheet = await readBack(buffer);
    expect(sheet.name.length).toBeLessThanOrEqual(31);
  });
});

describe("buildXlsxFilename", () => {
  it("builds a <prefix>-YYYY-MM-DD.xlsx filename from a given date", () => {
    expect(buildXlsxFilename("placements-report", new Date("2026-08-09T12:00:00.000Z"))).toBe("placements-report-2026-08-09.xlsx");
  });

  it("defaults to the current date when none is provided", () => {
    expect(buildXlsxFilename("alumni-report")).toMatch(/^alumni-report-\d{4}-\d{2}-\d{2}\.xlsx$/);
  });
});

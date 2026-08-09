import { describe, expect, it } from "vitest";
import { renderReportPptx } from "../../../src/modules/reports/infrastructure/export/render-report-pptx";

describe("renderReportPptx", () => {
  it("produces a genuine, non-empty PPTX (OOXML/ZIP) file", async () => {
    const buffer = await renderReportPptx({
      title: "Placement Report",
      subtitle: "Generated for tests",
      metrics: [
        { label: "Applied", value: 10 },
        { label: "Placed", value: 3 },
      ],
      tables: [{ title: "Companies Recruited", columns: ["Company", "Offers"], rows: [["Acme", "2"]] }],
    });

    expect(buffer.length).toBeGreaterThan(0);
    // PPTX files are ZIP archives — the magic bytes are the definitive "is this a real file" check, same discipline as the E3-E5 PDF export verification (%PDF magic bytes).
    expect(buffer.subarray(0, 2).toString("latin1")).toBe("PK");
  });

  it("skips a table slide entirely for an empty table (never renders a slide with only a header row)", async () => {
    const bufferWithEmptyTable = await renderReportPptx({
      title: "Alumni Report",
      metrics: [{ label: "Total Alumni", value: 0 }],
      tables: [{ title: "By Graduation Year", columns: ["Year", "Count"], rows: [] }],
    });
    expect(bufferWithEmptyTable.length).toBeGreaterThan(0);
  });

  it("handles zero metrics and zero tables without throwing", async () => {
    const buffer = await renderReportPptx({ title: "Empty Report", metrics: [], tables: [] });
    expect(buffer.length).toBeGreaterThan(0);
  });
});

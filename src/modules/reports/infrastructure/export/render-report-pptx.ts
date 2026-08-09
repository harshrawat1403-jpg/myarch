import PptxGenJS from "pptxgenjs";

export interface ReportPptxMetric {
  readonly label: string;
  readonly value: string | number;
}

export interface ReportPptxTable {
  readonly title: string;
  readonly columns: readonly string[];
  readonly rows: readonly (readonly string[])[];
}

export interface ReportPptxInput {
  readonly title: string;
  readonly subtitle?: string;
  readonly metrics: readonly ReportPptxMetric[];
  readonly tables: readonly ReportPptxTable[];
}

const ACCENT = "4F46E5"; // ACCENT_COLORS[0] (Indigo) from the publications module's own curated palette — one shared accent, not a second color system.

/**
 * V4.0 E7 (PRD §16 — "PPTX shared with Publication Studio's export
 * engine — one PPTX-writing capability serving two features, not two").
 * Shares the exact library and generation approach (pptxgenjs, real slide
 * objects built directly from data — never a screenshot) as
 * publications/infrastructure/export/render-pptx.ts, but is intentionally
 * its own small, generic renderer: report content (metric tiles + data
 * tables) has a fundamentally different shape than a publication's block
 * tree, so reusing that file's block-specific switch statement would mean
 * force-fitting report data into STAT_SUMMARY/TEXT blocks rather than
 * genuinely reusing anything. One slide of summary metric tiles, followed
 * by one real, editable pptxgenjs table per breakdown table — presentation-
 * ready, and genuinely "Editable" per §13.3's three-tier framework (real
 * text boxes and table cells, not a picture of one).
 */
export async function renderReportPptx(input: ReportPptxInput): Promise<Buffer> {
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: "REPORT", width: 10, height: 7.5 });
  pptx.layout = "REPORT";

  const summarySlide = pptx.addSlide();
  summarySlide.addText(input.title, { x: 0.5, y: 0.4, w: 9, h: 0.7, fontSize: 28, bold: true, color: ACCENT });
  if (input.subtitle) {
    summarySlide.addText(input.subtitle, { x: 0.5, y: 1.0, w: 9, h: 0.4, fontSize: 13, color: "6B7280" });
  }

  const perRow = 3;
  const cellW = 9 / perRow;
  input.metrics.forEach((metric, index) => {
    const col = index % perRow;
    const row = Math.floor(index / perRow);
    const x = 0.5 + col * cellW;
    const y = 1.8 + row * 1.3;
    summarySlide.addText(String(metric.value), { x, y, w: cellW - 0.3, h: 0.7, fontSize: 30, bold: true, color: ACCENT });
    summarySlide.addText(metric.label, { x, y: y + 0.7, w: cellW - 0.3, h: 0.4, fontSize: 11, color: "374151" });
  });

  for (const table of input.tables) {
    if (table.rows.length === 0) continue;
    const slide = pptx.addSlide();
    slide.addText(table.title, { x: 0.5, y: 0.4, w: 9, h: 0.6, fontSize: 20, bold: true, color: ACCENT });
    const headerRow = table.columns.map((col) => ({ text: col, options: { bold: true } }));
    const dataRows = table.rows.map((row) => row.map((cell) => ({ text: cell })));
    slide.addTable([headerRow, ...dataRows], {
      x: 0.5,
      y: 1.2,
      w: 9,
      fontSize: 11,
      border: { type: "solid", color: "E5E7EB", pt: 1 },
      fill: { color: "F9FAFB" },
      autoPage: true,
    });
  }

  const buffer = await pptx.write({ outputType: "nodebuffer" });
  return buffer as Buffer;
}

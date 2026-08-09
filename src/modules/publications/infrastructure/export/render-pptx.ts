import PptxGenJS from "pptxgenjs";
import { findAccentColor, findFontPairing } from "../../domain/blocks";
import type { PublicationBlock, PublicationContent } from "../../domain/blocks";
import type { PublicationPageSize } from "../../domain/entities";
import type { PublicationResolvedData } from "@/components/publications/publication-renderer";
import { pageDimensionsFor } from "@/components/publications/publication-renderer";

const PT_TO_IN = 1 / 72;

/**
 * §13.3 — "PPTX: full support via a real generation library. Editable in
 * PowerPoint/Keynote/Slides — the one format where 'you can actually edit
 * this' is a true statement." Deliberately does NOT reuse
 * `PublicationRenderer`/the screenshot pipeline — it walks the same block
 * tree directly and calls pptxgenjs's own text/image/shape APIs, so the
 * output is real slide objects (editable text boxes, real images), never a
 * picture of a page pasted onto a slide.
 */
export async function renderPublicationPptx(
  content: PublicationContent,
  pageSize: PublicationPageSize,
  resolvedData: PublicationResolvedData,
  resolveImageSrc: (fileId: string) => string,
): Promise<Buffer> {
  const dims = pageDimensionsFor(pageSize, null);
  const widthIn = dims.width * PT_TO_IN;
  const heightIn = dims.height * PT_TO_IN;
  const accent = findAccentColor(content.style.accentColor).hex.replace("#", "");
  const fonts = findFontPairing(content.style.fontPairing);
  const headingFont = fonts.heading.split(",")[0]!.replace(/'/g, "").trim();
  const bodyFont = fonts.body.split(",")[0]!.replace(/'/g, "").trim();

  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: "PUBLICATION", width: widthIn, height: heightIn });
  pptx.layout = "PUBLICATION";

  for (const block of content.blocks.filter((b) => b.visible)) {
    const slide = pptx.addSlide();
    addBlockToSlide(slide, block, { widthIn, heightIn, accent, headingFont, bodyFont, resolvedData, resolveImageSrc });
  }

  const buffer = await pptx.write({ outputType: "nodebuffer" });
  return buffer as Buffer;
}

interface SlideContext {
  widthIn: number;
  heightIn: number;
  accent: string;
  headingFont: string;
  bodyFont: string;
  resolvedData: PublicationResolvedData;
  resolveImageSrc: (fileId: string) => string;
}

function addBlockToSlide(slide: PptxGenJS.Slide, block: PublicationBlock, ctx: SlideContext) {
  const { widthIn, heightIn, accent, headingFont, bodyFont, resolvedData, resolveImageSrc } = ctx;

  switch (block.type) {
    case "COVER": {
      if (block.data.imageFileId) {
        const src = resolveImageSrc(block.data.imageFileId);
        if (src) slide.addImage({ data: src, x: widthIn / 2 - 2, y: 0.6, w: 4, h: 2.4, sizing: { type: "contain", w: 4, h: 2.4 } });
      }
      slide.addText(block.data.title, { x: 0.5, y: heightIn / 2 - 0.6, w: widthIn - 1, h: 1, align: "center", fontFace: headingFont, fontSize: 32, bold: true, color: accent });
      if (block.data.subtitle) {
        slide.addText(block.data.subtitle, { x: 0.5, y: heightIn / 2 + 0.4, w: widthIn - 1, h: 0.6, align: "center", fontFace: bodyFont, fontSize: 14, color: "4B5563" });
      }
      return;
    }

    case "HEADING":
      slide.addText(block.data.text, { x: 0.5, y: 0.4, w: widthIn - 1, h: 0.8, fontFace: headingFont, fontSize: block.data.level === 1 ? 24 : 18, bold: true, color: accent });
      return;

    case "TEXT":
      slide.addText(block.data.text, { x: 0.5, y: 0.5, w: widthIn - 1, h: heightIn - 1, fontFace: bodyFont, fontSize: 14, color: "1F2937", valign: "top" });
      return;

    case "IMAGE": {
      if (block.data.fileId) {
        const src = resolveImageSrc(block.data.fileId);
        if (src) slide.addImage({ data: src, x: 0.5, y: 0.5, w: widthIn - 1, h: heightIn - 1.2, sizing: { type: "contain", w: widthIn - 1, h: heightIn - 1.2 } });
      }
      if (block.data.caption) {
        slide.addText(block.data.caption, { x: 0.5, y: heightIn - 0.6, w: widthIn - 1, h: 0.4, align: "center", fontSize: 10, color: "6B7280" });
      }
      return;
    }

    case "STUDENT_PROFILE": {
      const student = resolvedData.students[block.data.studentProfileId];
      if (!student) return;
      let textX = 0.5;
      if (student.photoFileId) {
        const src = resolveImageSrc(student.photoFileId);
        if (src) {
          slide.addImage({ data: src, x: 0.5, y: 0.5, w: 1.6, h: 1.6, sizing: { type: "cover", w: 1.6, h: 1.6 } });
          textX = 2.4;
        }
      }
      slide.addText(student.fullName, { x: textX, y: 0.5, w: widthIn - textX - 0.5, h: 0.4, fontFace: headingFont, fontSize: 20, bold: true, color: accent });
      slide.addText(student.batchName, { x: textX, y: 0.9, w: widthIn - textX - 0.5, h: 0.3, fontSize: 10, color: "6B7280" });
      const bioLines = [
        student.bio ?? "",
        student.skills.length > 0 ? `Skills: ${student.skills.join(", ")}` : "",
        student.software.length > 0 ? `Software: ${student.software.join(", ")}` : "",
        student.portfolioLinks.length > 0 ? `Portfolio: ${student.portfolioLinks.join(", ")}` : "",
      ].filter(Boolean);
      slide.addText(bioLines.join("\n\n"), { x: textX, y: 1.4, w: widthIn - textX - 0.5, h: heightIn - 1.8, fontSize: 11, color: "1F2937", valign: "top" });
      return;
    }

    case "COMPANY_LOGO_GRID": {
      const companies = block.data.companyIds.map((id) => resolvedData.companies[id]).filter((c): c is NonNullable<typeof c> => !!c);
      const perRow = 3;
      const cellW = (widthIn - 1) / perRow;
      companies.forEach((company, index) => {
        const col = index % perRow;
        const row = Math.floor(index / perRow);
        const x = 0.5 + col * cellW;
        const y = 0.6 + row * 1.6;
        const logoSrc = company.logoFileId ? resolveImageSrc(company.logoFileId) : "";
        if (logoSrc) {
          slide.addImage({ data: logoSrc, x: x + 0.2, y, w: cellW - 0.4, h: 0.9, sizing: { type: "contain", w: cellW - 0.4, h: 0.9 } });
        } else {
          slide.addText(company.name, { x, y, w: cellW, h: 0.9, align: "center", fontSize: 12, bold: true, valign: "middle" });
        }
        slide.addText(company.name, { x, y: y + 0.95, w: cellW, h: 0.3, align: "center", fontSize: 9, color: "6B7280" });
      });
      return;
    }

    case "ALUMNI_PROFILE": {
      const alumni = resolvedData.alumni[block.data.alumniProfileId];
      if (!alumni) return;
      slide.addText(alumni.fullName, { x: 0.5, y: 0.5, w: widthIn - 1, h: 0.5, fontFace: headingFont, fontSize: 18, bold: true, color: accent });
      slide.addText(`Class of ${alumni.graduationYear}`, { x: 0.5, y: 1.0, w: widthIn - 1, h: 0.3, fontSize: 10, color: "6B7280" });
      const details = [
        [alumni.designation, alumni.currentCompany].filter(Boolean).join(" at "),
        alumni.location ?? "",
      ].filter(Boolean);
      slide.addText(details.join("\n"), { x: 0.5, y: 1.4, w: widthIn - 1, h: 1, fontSize: 12, color: "1F2937" });
      return;
    }

    case "STAT_SUMMARY": {
      slide.addText(block.data.title, { x: 0.5, y: 0.4, w: widthIn - 1, h: 0.6, fontFace: headingFont, fontSize: 20, bold: true, color: accent });
      const stats = resolvedData.stats;
      const tiles: [string, number][] = [
        ["Applications", stats?.totalApplications ?? 0],
        ["Offers Made", stats?.totalOffers ?? 0],
        ["Students Placed", stats?.totalPlaced ?? 0],
        ["Placement Drives", stats?.totalDrives ?? 0],
        ["Partner Companies", stats?.totalCompanies ?? 0],
      ];
      const perRow = 2;
      const cellW = (widthIn - 1) / perRow;
      tiles.forEach(([label, value], index) => {
        const col = index % perRow;
        const row = Math.floor(index / perRow);
        const x = 0.5 + col * cellW;
        const y = 1.2 + row * 1.2;
        slide.addText(String(value), { x, y, w: cellW - 0.2, h: 0.7, fontSize: 28, bold: true, color: accent });
        slide.addText(label, { x, y: y + 0.7, w: cellW - 0.2, h: 0.3, fontSize: 10, color: "6B7280" });
      });
      return;
    }

    case "DIVIDER":
      slide.addShape("line", { x: 0.5, y: heightIn / 2, w: widthIn - 1, h: 0, line: { color: "E5E7EB", width: 1 } });
      return;

    case "BACK_COVER":
      if (block.data.text) {
        slide.addText(block.data.text, { x: 0.5, y: heightIn / 2 - 0.3, w: widthIn - 1, h: 0.6, align: "center", fontSize: 12, color: "4B5563" });
      }
      return;
  }
}

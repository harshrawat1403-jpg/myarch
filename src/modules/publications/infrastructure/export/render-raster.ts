import { chromium } from "playwright";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import JSZip from "jszip";
import { PublicationRenderer, type PublicationResolvedData, pageDimensionsFor } from "@/components/publications/publication-renderer";
import type { PublicationContent } from "../../domain/blocks";
import type { PublicationPageSize } from "../../domain/entities";
import { wrapHtmlDocument } from "./html-document";

const PT_TO_PX = 96 / 72;

/**
 * §13.3 — "PNG/JPEG: full support, one raster image per page." A
 * publication with N visible pages produces N images; since
 * `PublicationExport` holds exactly one `FileAsset`, the set is delivered
 * as a single `.zip` (page-1.png, page-2.png, ...) rather than requiring a
 * schema change to support multiple files per export row.
 */
export async function renderPublicationRasterZip(
  content: PublicationContent,
  pageSize: PublicationPageSize,
  resolvedData: PublicationResolvedData,
  resolveImageSrc: (fileId: string) => string,
  format: "PNG" | "JPEG",
): Promise<Buffer> {
  const visibleBlocks = content.blocks.filter((b) => b.visible);
  const dims = pageDimensionsFor(pageSize, null);
  const widthPx = Math.round(dims.width * PT_TO_PX);
  const heightPx = Math.round(dims.height * PT_TO_PX);

  const zip = new JSZip();
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: widthPx, height: heightPx }, deviceScaleFactor: 2 });

    for (let i = 0; i < visibleBlocks.length; i++) {
      const singlePageContent: PublicationContent = { blocks: [visibleBlocks[i]!], style: content.style };
      const bodyHtml = renderToStaticMarkup(
        createElement(PublicationRenderer, { content: singlePageContent, pageSize, resolvedData, resolveImageSrc, includeHiddenBlocks: true }),
      );
      await page.setContent(wrapHtmlDocument(bodyHtml), { waitUntil: "networkidle" });
      const screenshot = await page.screenshot({
        type: format === "PNG" ? "png" : "jpeg",
        clip: { x: 0, y: 0, width: widthPx, height: heightPx },
        quality: format === "JPEG" ? 90 : undefined,
      });
      zip.file(`page-${i + 1}.${format.toLowerCase()}`, screenshot);
    }
  } finally {
    await browser.close();
  }

  return zip.generateAsync({ type: "nodebuffer" });
}

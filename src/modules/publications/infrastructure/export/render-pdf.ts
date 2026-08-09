import { chromium } from "playwright";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { PublicationRenderer, type PublicationResolvedData, pageDimensionsFor } from "@/components/publications/publication-renderer";
import type { PublicationContent } from "../../domain/blocks";
import type { PublicationPageSize } from "../../domain/entities";
import { wrapHtmlDocument } from "./html-document";

/** §13.3 — "PDF: full support, first-class, generated server-side (headless rendering of the block tree)." Reuses Playwright (already a project dependency for verification) rather than adding a second, unrelated PDF library. */
export async function renderPublicationPdf(
  content: PublicationContent,
  pageSize: PublicationPageSize,
  resolvedData: PublicationResolvedData,
  resolveImageSrc: (fileId: string) => string,
): Promise<Buffer> {
  const bodyHtml = renderToStaticMarkup(
    createElement(PublicationRenderer, { content, pageSize, resolvedData, resolveImageSrc }),
  );
  const html = wrapHtmlDocument(bodyHtml);
  const dims = pageDimensionsFor(pageSize, null);

  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle" });
    // Playwright's page.pdf() width/height only accept px/in/cm/mm (no "pt") — dims are in points (1pt = 1/72in), so convert.
    const pdfBuffer = await page.pdf({
      width: `${dims.width / 72}in`,
      height: `${dims.height / 72}in`,
      printBackground: true,
      margin: { top: "0", bottom: "0", left: "0", right: "0" },
    });
    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}

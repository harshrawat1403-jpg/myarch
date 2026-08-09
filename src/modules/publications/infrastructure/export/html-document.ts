/** A minimal, self-contained HTML shell — no external stylesheets/scripts/fonts, so Playwright's `page.setContent()` never makes a network request while rendering an export. */
export function wrapHtmlDocument(bodyHtml: string): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  section { page-break-after: always; }
  section:last-child { page-break-after: auto; }
</style>
</head>
<body>${bodyHtml}</body>
</html>`;
}

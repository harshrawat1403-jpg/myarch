/**
 * The one place branding and the footer are defined. Every rendered email —
 * present and future — goes through wrapHtml()/wrapText(), so adding a new
 * template can never duplicate or drift from this layout.
 */

const BRAND_NAME = "TNPArch";
const BRAND_TAGLINE = "Training & Placement Portal — Department of Architecture & Planning, VNIT Nagpur";
const FOOTER_TEXT =
  "This is an automated message from TNPArch. Please do not reply to this email.";

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function wrapHtml(bodyHtml: string): string {
  return `<!doctype html>
<html>
  <body style="font-family: sans-serif; background-color: #15171B; color: #ECEAE4; padding: 24px;">
    <div style="max-width: 560px; margin: 0 auto;">
      <div style="border-bottom: 1px solid #4FB8D4; padding-bottom: 12px; margin-bottom: 20px;">
        <strong style="font-size: 18px; color: #4FB8D4;">${BRAND_NAME}</strong>
        <div style="font-size: 12px; color: #8B8F98;">${BRAND_TAGLINE}</div>
      </div>
      <div style="font-size: 14px; line-height: 1.6;">${bodyHtml}</div>
      <div style="border-top: 1px solid #1D2024; margin-top: 24px; padding-top: 12px; font-size: 11px; color: #8B8F98;">
        ${FOOTER_TEXT}
      </div>
    </div>
  </body>
</html>`;
}

export function wrapText(bodyText: string): string {
  return `${BRAND_NAME}\n${BRAND_TAGLINE}\n\n${bodyText}\n\n—\n${FOOTER_TEXT}`;
}

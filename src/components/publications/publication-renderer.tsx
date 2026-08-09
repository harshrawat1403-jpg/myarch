// Values from the client-safe entry point (see client.ts's own doc comment)
// — this component is rendered both in the browser (editor preview) and,
// via renderToStaticMarkup, inside the server-only export job; pulling a
// value out of the main barrel here would drag Playwright/pptxgenjs into
// any client bundle that imports this file.
import { findAccentColor, findFontPairing, type PublicationBlock, type PublicationContent } from "@/modules/publications/client";
import type { PublicationPageSize, ResolvedAlumniProfile, ResolvedCompany, ResolvedStats, ResolvedStudentProfile } from "@/modules/publications";

export interface PublicationResolvedData {
  readonly students: Readonly<Record<string, ResolvedStudentProfile>>;
  readonly companies: Readonly<Record<string, ResolvedCompany>>;
  readonly alumni: Readonly<Record<string, ResolvedAlumniProfile>>;
  readonly stats: ResolvedStats | null;
}

export interface PublicationRendererProps {
  readonly content: PublicationContent;
  readonly pageSize: PublicationPageSize;
  readonly resolvedData: PublicationResolvedData;
  /** Resolves an IMAGE/COVER block's fileId to a real `<img src>` — a plain URL for the live editor preview, a `data:` URI for the standalone export renderer (see publication-export-renderer.ts). Kept as an injected function so this one component serves both contexts identically — "Preview renders exactly as it will export" (§13.1 step 4) holds by construction, not by convention. */
  readonly resolveImageSrc: (fileId: string) => string;
  /** Only visible blocks render by default (the live editor); the export renderer passes `true` so a hidden block never appears in a generated file even if a bug in the editor briefly shows it. */
  readonly includeHiddenBlocks?: boolean;
}

const PAGE_DIMENSIONS_PT: Record<Exclude<PublicationPageSize, "CUSTOM">, { width: number; height: number }> = {
  A4_PORTRAIT: { width: 595, height: 842 },
  A4_LANDSCAPE: { width: 842, height: 595 },
  A3: { width: 842, height: 1191 },
};

export function pageDimensionsFor(pageSize: PublicationPageSize, customDimensions: { widthPt: number; heightPt: number } | null) {
  if (pageSize === "CUSTOM" && customDimensions) return { width: customDimensions.widthPt, height: customDimensions.heightPt };
  return PAGE_DIMENSIONS_PT[pageSize === "CUSTOM" ? "A4_PORTRAIT" : pageSize];
}

/**
 * V4.0 E4/E5 (§13.1 steps 4 & 6) — one top-level block = one page, matching
 * "cover → intro → per-student page × N → ... → back cover" literally.
 * Every visual property is an inline `style` (never a Tailwind class) so
 * this renders identically whether mounted inside the Next.js app (editor
 * preview) or serialized standalone via `renderToStaticMarkup` for
 * Playwright (export) — Tailwind's runtime isn't present in the latter.
 */
export function PublicationRenderer({ content, pageSize, resolvedData, resolveImageSrc, includeHiddenBlocks = false }: PublicationRendererProps) {
  const accent = findAccentColor(content.style.accentColor);
  const fonts = findFontPairing(content.style.fontPairing);
  const dimensions = pageDimensionsFor(pageSize, null);
  const blocks = includeHiddenBlocks ? content.blocks : content.blocks.filter((b) => b.visible);

  return (
    <div data-publication-renderer="true">
      {blocks.map((b) => (
        <PublicationPage key={b.id} block={b} accentHex={accent.hex} fonts={fonts} dimensions={dimensions} resolvedData={resolvedData} resolveImageSrc={resolveImageSrc} />
      ))}
    </div>
  );
}

interface PageProps {
  block: PublicationBlock;
  accentHex: string;
  fonts: { heading: string; body: string };
  dimensions: { width: number; height: number };
  resolvedData: PublicationResolvedData;
  resolveImageSrc: (fileId: string) => string;
}

function PublicationPage({ block, accentHex, fonts, dimensions, resolvedData, resolveImageSrc }: PageProps) {
  return (
    <section
      data-block-id={block.id}
      data-block-type={block.type}
      style={{
        width: `${dimensions.width}pt`,
        height: `${dimensions.height}pt`,
        boxSizing: "border-box",
        padding: "40pt",
        fontFamily: fonts.body,
        color: "#1F2937",
        backgroundColor: "#FFFFFF",
        display: "flex",
        flexDirection: "column",
        pageBreakAfter: "always",
        overflow: "hidden",
      }}
    >
      <BlockBody block={block} accentHex={accentHex} fonts={fonts} resolvedData={resolvedData} resolveImageSrc={resolveImageSrc} />
    </section>
  );
}

function BlockBody({ block, accentHex, fonts, resolvedData, resolveImageSrc }: Omit<PageProps, "dimensions">) {
  switch (block.type) {
    case "COVER":
      return (
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", flex: 1, textAlign: "center", gap: "16pt" }}>
          {block.data.imageFileId && (
            // eslint-disable-next-line @next/next/no-img-element -- standalone-renderable markup (no next/image optimizer in the export context)
            <img src={resolveImageSrc(block.data.imageFileId)} alt="" style={{ maxWidth: "60%", maxHeight: "200pt", objectFit: "contain" }} />
          )}
          <h1 style={{ fontFamily: fonts.heading, fontSize: "32pt", fontWeight: 700, color: accentHex, margin: 0 }}>{block.data.title}</h1>
          {block.data.subtitle && <p style={{ fontSize: "14pt", color: "#4B5563", margin: 0 }}>{block.data.subtitle}</p>}
        </div>
      );

    case "HEADING":
      return (
        <div style={{ borderBottom: `2pt solid ${accentHex}`, paddingBottom: "8pt", marginBottom: "16pt" }}>
          {block.data.level === 1 ? (
            <h1 style={{ fontFamily: fonts.heading, fontSize: "24pt", color: accentHex, margin: 0 }}>{block.data.text}</h1>
          ) : (
            <h2 style={{ fontFamily: fonts.heading, fontSize: "18pt", color: accentHex, margin: 0 }}>{block.data.text}</h2>
          )}
        </div>
      );

    case "TEXT":
      return <p style={{ fontSize: "11pt", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{block.data.text}</p>;

    case "IMAGE":
      return (
        <figure style={{ margin: 0, textAlign: "center" }}>
          {block.data.fileId && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={resolveImageSrc(block.data.fileId)} alt={block.data.caption ?? ""} style={{ maxWidth: "100%", maxHeight: "500pt", objectFit: "contain" }} />
          )}
          {block.data.caption && <figcaption style={{ fontSize: "9pt", color: "#6B7280", marginTop: "8pt" }}>{block.data.caption}</figcaption>}
        </figure>
      );

    case "STUDENT_PROFILE": {
      const student = resolvedData.students[block.data.studentProfileId];
      if (!student) return <p style={{ fontSize: "10pt", color: "#9CA3AF" }}>Student profile unavailable.</p>;
      return (
        <div style={{ display: "flex", gap: "20pt" }}>
          {student.photoFileId && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={resolveImageSrc(student.photoFileId)} alt="" style={{ width: "100pt", height: "100pt", objectFit: "cover", borderRadius: "6pt", flexShrink: 0 }} />
          )}
          <div style={{ flex: 1 }}>
            <h2 style={{ fontFamily: fonts.heading, fontSize: "18pt", color: accentHex, margin: "0 0 2pt" }}>{student.fullName}</h2>
            <p style={{ fontSize: "9pt", color: "#6B7280", margin: "0 0 10pt" }}>{student.batchName}</p>
            {student.bio && <p style={{ fontSize: "10pt", lineHeight: 1.5, margin: "0 0 10pt" }}>{student.bio}</p>}
            {student.skills.length > 0 && <ChipRow label="Skills" items={student.skills} accentHex={accentHex} />}
            {student.software.length > 0 && <ChipRow label="Software" items={student.software} accentHex={accentHex} />}
            {student.portfolioLinks.length > 0 && (
              <p style={{ fontSize: "9pt", color: "#374151", marginTop: "8pt" }}>Portfolio: {student.portfolioLinks.join(", ")}</p>
            )}
          </div>
        </div>
      );
    }

    case "COMPANY_LOGO_GRID": {
      const companies = block.data.companyIds.map((id) => resolvedData.companies[id]).filter((c): c is ResolvedCompany => !!c);
      return (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "16pt", alignItems: "flex-start" }}>
          {companies.map((company) => (
            <div key={company.companyId} style={{ width: "140pt", textAlign: "center", border: "1pt solid #E5E7EB", borderRadius: "6pt", padding: "12pt" }}>
              {company.logoFileId ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={resolveImageSrc(company.logoFileId)} alt="" style={{ maxWidth: "100%", maxHeight: "50pt", objectFit: "contain" }} />
              ) : (
                <div style={{ fontSize: "11pt", fontWeight: 600 }}>{company.name}</div>
              )}
              <div style={{ fontSize: "9pt", color: "#6B7280", marginTop: "6pt" }}>{company.name}</div>
            </div>
          ))}
        </div>
      );
    }

    case "ALUMNI_PROFILE": {
      const alumni = resolvedData.alumni[block.data.alumniProfileId];
      if (!alumni) return <p style={{ fontSize: "10pt", color: "#9CA3AF" }}>Alumni profile unavailable.</p>;
      return (
        <div>
          <h2 style={{ fontFamily: fonts.heading, fontSize: "16pt", color: accentHex, margin: "0 0 2pt" }}>{alumni.fullName}</h2>
          <p style={{ fontSize: "9pt", color: "#6B7280", margin: "0 0 10pt" }}>Class of {alumni.graduationYear}</p>
          {(alumni.designation || alumni.currentCompany) && (
            <p style={{ fontSize: "11pt", margin: "0 0 4pt" }}>
              {[alumni.designation, alumni.currentCompany].filter(Boolean).join(" at ")}
            </p>
          )}
          {alumni.location && <p style={{ fontSize: "10pt", color: "#6B7280" }}>{alumni.location}</p>}
        </div>
      );
    }

    case "STAT_SUMMARY": {
      const stats = resolvedData.stats;
      return (
        <div>
          <h2 style={{ fontFamily: fonts.heading, fontSize: "18pt", color: accentHex, margin: "0 0 16pt" }}>{block.data.title}</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16pt" }}>
            <StatTile label="Applications" value={stats?.totalApplications ?? 0} accentHex={accentHex} />
            <StatTile label="Offers Made" value={stats?.totalOffers ?? 0} accentHex={accentHex} />
            <StatTile label="Students Placed" value={stats?.totalPlaced ?? 0} accentHex={accentHex} />
            <StatTile label="Placement Drives" value={stats?.totalDrives ?? 0} accentHex={accentHex} />
            <StatTile label="Partner Companies" value={stats?.totalCompanies ?? 0} accentHex={accentHex} />
          </div>
        </div>
      );
    }

    case "DIVIDER":
      return <hr style={{ border: "none", borderTop: "1pt solid #E5E7EB", margin: "20pt 0" }} />;

    case "BACK_COVER":
      return (
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", flex: 1, textAlign: "center" }}>
          {block.data.text && <p style={{ fontSize: "11pt", color: "#4B5563" }}>{block.data.text}</p>}
        </div>
      );
  }
}

function ChipRow({ label, items, accentHex }: { label: string; items: readonly string[]; accentHex: string }) {
  return (
    <div style={{ marginBottom: "8pt" }}>
      <div style={{ fontSize: "8pt", textTransform: "uppercase", color: "#9CA3AF", marginBottom: "3pt" }}>{label}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "4pt" }}>
        {items.map((item) => (
          <span key={item} style={{ fontSize: "8pt", padding: "2pt 6pt", borderRadius: "8pt", border: `0.75pt solid ${accentHex}`, color: accentHex }}>
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

function StatTile({ label, value, accentHex }: { label: string; value: number; accentHex: string }) {
  return (
    <div style={{ border: "1pt solid #E5E7EB", borderRadius: "6pt", padding: "12pt" }}>
      <div style={{ fontSize: "22pt", fontWeight: 700, color: accentHex }}>{value}</div>
      <div style={{ fontSize: "9pt", color: "#6B7280" }}>{label}</div>
    </div>
  );
}

import { Card } from "@/components/ui/card";
import { CardTitle, DataLabel } from "@/components/ui/typography";
import { ImagePlaceholder, type ImagePlaceholderProps } from "./image-placeholder";

export interface ProjectShowcaseCardProps {
  title: string;
  studio: string;
  description: string;
  /** Version 2.0: the lead tile in the showcase gallery — taller image, larger title, meant to span extra grid space. Visual emphasis only; the data shape is unchanged. */
  featured?: boolean;
  className?: string;
  /** Passed straight through to `ImagePlaceholder` — lets a gallery grid give each tile a different color identity instead of a repeated wash. */
  tone?: ImagePlaceholderProps["tone"];
}

/**
 * Featured Student Work card. Version 2.0 (visual pass 2): part of a bento-
 * style gallery grid rather than three uniform tiles — `featured` makes one
 * tile the visual anchor (taller image, larger title) so the section reads
 * as a curated gallery, not a repeated card template. Image slot uses the
 * shared `ImagePlaceholder` — no real project imagery exists yet (no
 * object storage/upload pipeline, see TECHNICAL_DEBT.md).
 */
export function ProjectShowcaseCard({
  title,
  studio,
  description,
  featured = false,
  className = "",
  tone = "violet",
}: ProjectShowcaseCardProps) {
  return (
    <Card padded={false} className={`flex h-full flex-col overflow-hidden ${className}`}>
      <ImagePlaceholder
        label="Studio Project Photo"
        aspect={featured ? "tall" : "video"}
        tag={false}
        rounded={false}
        tone={tone}
      />
      <div className="flex flex-1 flex-col p-6">
        <DataLabel>{studio}</DataLabel>
        <CardTitle className={`mt-1 ${featured ? "text-lg lg:text-xl" : ""}`}>{title}</CardTitle>
        <p className="mt-2 text-sm text-(--color-text-secondary)">{description}</p>
      </div>
    </Card>
  );
}

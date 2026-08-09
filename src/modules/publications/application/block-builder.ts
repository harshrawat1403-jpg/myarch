import { randomUUID } from "node:crypto";
import type { PublicationBlock, PublicationContent } from "../domain/blocks";
import type { PublicationDataBindingKind } from "../domain/blocks";
import type { PublicationTemplateStructure } from "../domain/entities";

/**
 * §13.1 step 2 — splices one auto-populated, data-bound block per selected
 * id into the template's base block list, immediately after the template's
 * designated insertion point. Each generated block stores only the
 * reference id (studentProfileId/companyId/alumniProfileId) — the actual
 * name/bio/logo is resolved live by PublicationDataLookup at render time,
 * never copied in here.
 */
export function buildInitialContent(structure: PublicationTemplateStructure, selectedIds: readonly string[]): PublicationContent {
  const dataBlocks = buildDataBlocks(structure.dataBinding, selectedIds);
  const blocks = spliceBlocks(structure.baseBlocks, structure.insertDataBlocksAfterBlockId, dataBlocks);
  return { blocks, style: structure.defaultStyle };
}

function buildDataBlocks(kind: PublicationDataBindingKind, selectedIds: readonly string[]): PublicationBlock[] {
  switch (kind) {
    case "STUDENTS":
      return selectedIds.map((studentProfileId) => ({ id: randomUUID(), type: "STUDENT_PROFILE", visible: true, data: { studentProfileId } }));
    case "ALUMNI":
      return selectedIds.map((alumniProfileId) => ({ id: randomUUID(), type: "ALUMNI_PROFILE", visible: true, data: { alumniProfileId } }));
    case "COMPANIES":
      // One grid block holding every selected company — a per-company block
      // would produce one page per logo, which isn't how a "recruiting
      // partners" page reads; a single grid is the correct shape here.
      return selectedIds.length > 0 ? [{ id: randomUUID(), type: "COMPANY_LOGO_GRID", visible: true, data: { companyIds: selectedIds } }] : [];
    case "STATS":
      return [{ id: randomUUID(), type: "STAT_SUMMARY", visible: true, data: { title: "This Year at a Glance" } }];
    case "NONE":
      return [];
  }
}

function spliceBlocks(baseBlocks: readonly PublicationBlock[], afterBlockId: string | null, dataBlocks: PublicationBlock[]): PublicationBlock[] {
  if (dataBlocks.length === 0) return [...baseBlocks];
  if (afterBlockId === null) return [...baseBlocks, ...dataBlocks];

  const index = baseBlocks.findIndex((b) => b.id === afterBlockId);
  if (index === -1) return [...baseBlocks, ...dataBlocks];

  const result = [...baseBlocks];
  result.splice(index + 1, 0, ...dataBlocks);
  return result;
}

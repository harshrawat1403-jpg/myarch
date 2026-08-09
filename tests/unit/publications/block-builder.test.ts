import { describe, expect, it } from "vitest";
import { buildInitialContent } from "../../../src/modules/publications/application/block-builder";
import { DEFAULT_STYLE } from "../../../src/modules/publications/client";
import type { PublicationTemplateStructure } from "../../../src/modules/publications";

const baseBlocks: PublicationTemplateStructure["baseBlocks"] = [
  { id: "cover", type: "COVER", visible: true, data: { title: "Cover", subtitle: null, imageFileId: null } },
  { id: "intro", type: "TEXT", visible: true, data: { text: "Intro" } },
  { id: "back", type: "BACK_COVER", visible: true, data: { text: null } },
];

describe("buildInitialContent (§13.1 step 2 — auto-populate, never copy-pasted)", () => {
  it("returns only base blocks when no ids are selected on a NONE template", () => {
    const structure: PublicationTemplateStructure = { dataBinding: "NONE", defaultStyle: DEFAULT_STYLE, insertDataBlocksAfterBlockId: null, baseBlocks };
    const content = buildInitialContent(structure, []);
    expect(content.blocks).toEqual(baseBlocks);
    expect(content.style).toBe(DEFAULT_STYLE);
  });

  it("splices one STUDENT_PROFILE block per selected id, storing only the reference id", () => {
    const structure: PublicationTemplateStructure = { dataBinding: "STUDENTS", defaultStyle: DEFAULT_STYLE, insertDataBlocksAfterBlockId: "intro", baseBlocks };
    const content = buildInitialContent(structure, ["s1", "s2"]);
    expect(content.blocks).toHaveLength(5);
    const introIndex = content.blocks.findIndex((b) => b.id === "intro");
    expect(content.blocks[introIndex + 1]).toMatchObject({ type: "STUDENT_PROFILE", data: { studentProfileId: "s1" } });
    expect(content.blocks[introIndex + 2]).toMatchObject({ type: "STUDENT_PROFILE", data: { studentProfileId: "s2" } });
  });

  it("splices one ALUMNI_PROFILE block per selected id after the insertion point", () => {
    const structure: PublicationTemplateStructure = { dataBinding: "ALUMNI", defaultStyle: DEFAULT_STYLE, insertDataBlocksAfterBlockId: "intro", baseBlocks };
    const content = buildInitialContent(structure, ["a1"]);
    expect(content.blocks.find((b) => b.type === "ALUMNI_PROFILE")).toMatchObject({ data: { alumniProfileId: "a1" } });
  });

  it("groups all selected companies into a single COMPANY_LOGO_GRID block, not one block per company", () => {
    const structure: PublicationTemplateStructure = { dataBinding: "COMPANIES", defaultStyle: DEFAULT_STYLE, insertDataBlocksAfterBlockId: "intro", baseBlocks };
    const content = buildInitialContent(structure, ["c1", "c2", "c3"]);
    const gridBlocks = content.blocks.filter((b) => b.type === "COMPANY_LOGO_GRID");
    expect(gridBlocks).toHaveLength(1);
    expect(gridBlocks[0]).toMatchObject({ data: { companyIds: ["c1", "c2", "c3"] } });
  });

  it("produces no COMPANY_LOGO_GRID block when no companies are selected", () => {
    const structure: PublicationTemplateStructure = { dataBinding: "COMPANIES", defaultStyle: DEFAULT_STYLE, insertDataBlocksAfterBlockId: "intro", baseBlocks };
    const content = buildInitialContent(structure, []);
    expect(content.blocks).toEqual(baseBlocks);
  });

  it("always produces exactly one STAT_SUMMARY block for a STATS template, ignoring selectedIds", () => {
    const structure: PublicationTemplateStructure = { dataBinding: "STATS", defaultStyle: DEFAULT_STYLE, insertDataBlocksAfterBlockId: "intro", baseBlocks };
    const content = buildInitialContent(structure, ["ignored"]);
    expect(content.blocks.filter((b) => b.type === "STAT_SUMMARY")).toHaveLength(1);
  });

  it("appends at the end when insertDataBlocksAfterBlockId is null", () => {
    const structure: PublicationTemplateStructure = { dataBinding: "STUDENTS", defaultStyle: DEFAULT_STYLE, insertDataBlocksAfterBlockId: null, baseBlocks };
    const content = buildInitialContent(structure, ["s1"]);
    expect(content.blocks[content.blocks.length - 1]).toMatchObject({ type: "STUDENT_PROFILE" });
  });

  it("appends at the end when the insertion point block id doesn't exist", () => {
    const structure: PublicationTemplateStructure = { dataBinding: "STUDENTS", defaultStyle: DEFAULT_STYLE, insertDataBlocksAfterBlockId: "nonexistent", baseBlocks };
    const content = buildInitialContent(structure, ["s1"]);
    expect(content.blocks[content.blocks.length - 1]).toMatchObject({ type: "STUDENT_PROFILE" });
  });
});

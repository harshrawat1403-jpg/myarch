import { describe, expect, it } from "vitest";
import { publicationsBreakdownRows } from "../../../src/modules/reports/presentation/columns";
import type { PublicationsUsageReport } from "../../../src/modules/reports/domain/entities";

describe("publicationsBreakdownRows", () => {
  it("combines byStatus and byType into one long-format table, dimension-tagged", () => {
    const report: PublicationsUsageReport = {
      totalPublications: 5,
      byStatus: [
        { status: "DRAFT", count: 3 },
        { status: "PUBLISHED", count: 2 },
      ],
      byType: [{ type: "BROCHURE", count: 5 }],
      exportsByFormat: [],
      exportsByStatus: [],
      filters: {},
    };

    expect(publicationsBreakdownRows(report)).toEqual([
      { dimension: "Status", value: "DRAFT", count: 3 },
      { dimension: "Status", value: "PUBLISHED", count: 2 },
      { dimension: "Type", value: "BROCHURE", count: 5 },
    ]);
  });

  it("returns an empty array for an empty report", () => {
    const report: PublicationsUsageReport = { totalPublications: 0, byStatus: [], byType: [], exportsByFormat: [], exportsByStatus: [], filters: {} };
    expect(publicationsBreakdownRows(report)).toEqual([]);
  });
});

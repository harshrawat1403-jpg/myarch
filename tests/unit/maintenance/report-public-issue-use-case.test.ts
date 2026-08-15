import { beforeEach, describe, expect, it, vi } from "vitest";
import { ReportPublicMaintenanceIssueUseCase } from "../../../src/modules/maintenance/application/use-cases/report-public-issue";
import { InMemoryMaintenanceIssueRepository } from "../../support/fakes/in-memory-maintenance-issue-repository";
import { FakeNotificationService } from "../../support/fakes/fake-notification-service";

function buildContext() {
  const maintenanceIssueRepository = new InMemoryMaintenanceIssueRepository();
  const secretaryRecipientLookup = { listActiveSecretaryUserIds: vi.fn().mockResolvedValue(["sec-1", "sec-2"]) };
  const notificationService = new FakeNotificationService();
  const useCase = new ReportPublicMaintenanceIssueUseCase({
    maintenanceIssueRepository,
    secretaryRecipientLookup,
    notificationService,
  });
  return { useCase, maintenanceIssueRepository, notificationService, secretaryRecipientLookup };
}

const VALID_INPUT = {
  name: "Jane Visitor",
  email: "jane@example.com",
  category: "ELECTRICAL" as const,
  location: "Main Gate",
  description: "Flickering streetlight",
};

describe("ReportPublicMaintenanceIssueUseCase", () => {
  let ctx: ReturnType<typeof buildContext>;

  beforeEach(() => {
    ctx = buildContext();
  });

  it("creates a SUBMITTED issue with requesterId null and the public contact fields stored", async () => {
    const issue = await ctx.useCase.execute(VALID_INPUT);
    expect(issue.status).toBe("SUBMITTED");
    expect(issue.requesterId).toBeNull();
    expect(issue.publicReporterName).toBe("Jane Visitor");
    expect(issue.publicReporterEmail).toBe("jane@example.com");
  });

  it("trims and lowercases the submitted email, trims the name", async () => {
    const issue = await ctx.useCase.execute({ ...VALID_INPUT, name: "  Jane Visitor  ", email: "  JANE@EXAMPLE.COM  " });
    expect(issue.publicReporterName).toBe("Jane Visitor");
    expect(issue.publicReporterEmail).toBe("jane@example.com");
  });

  it("notifies every active Secretary, exactly like the authenticated report path", async () => {
    await ctx.useCase.execute(VALID_INPUT);
    expect(ctx.notificationService.sent).toContainEqual(
      expect.objectContaining({ recipientUserId: "sec-1", template: "MAINTENANCE_ISSUE_SUBMITTED" }),
    );
    expect(ctx.notificationService.sent).toContainEqual(expect.objectContaining({ recipientUserId: "sec-2" }));
  });

  it("never requires or accepts an actor — no authorization check exists for this path", async () => {
    // No `actor` field anywhere in the input type — this is a compile-time
    // guarantee (ReportPublicMaintenanceIssueInput has no actor property),
    // reconfirmed here at runtime: the call succeeds with contact info only.
    await expect(ctx.useCase.execute(VALID_INPUT)).resolves.toBeDefined();
  });

  it("does not create a real User account for the complainant — the repository never provisions one", async () => {
    const issue = await ctx.useCase.execute(VALID_INPUT);
    // The only side effect on the issue repository is the one issue row —
    // no user-provisioning port is even injected into this use case's deps.
    const stored = await ctx.maintenanceIssueRepository.findById(issue.id);
    expect(stored?.requesterId).toBeNull();
  });
});

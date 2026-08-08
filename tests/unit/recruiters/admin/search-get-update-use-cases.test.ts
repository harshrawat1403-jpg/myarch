import { beforeEach, describe, expect, it } from "vitest";
import { SearchRecruiterAccountsUseCase } from "../../../../src/modules/recruiters/application/use-cases/admin/search-recruiter-accounts";
import { GetRecruiterAccountUseCase } from "../../../../src/modules/recruiters/application/use-cases/admin/get-recruiter-account";
import { UpdateRecruiterAccountUseCase } from "../../../../src/modules/recruiters/application/use-cases/admin/update-recruiter-account";
import { RecruiterAccountNotFoundError } from "../../../../src/modules/recruiters/domain/errors";
import { NotAuthorizedError } from "../../../../src/lib/errors";
import { InMemoryRecruiterAccountRepository } from "../../../support/fakes/in-memory-recruiter-account-repository";
import { FakeAuditRecorder } from "../../../support/fakes/fake-audit-recorder";
import type { RecruiterAccountRecord } from "../../../../src/modules/recruiters";
import type { AuthenticatedActor } from "../../../../src/modules/auth";

const SECRETARY: AuthenticatedActor = { userId: "sec-1", role: "SECRETARY" };
const COORDINATOR: AuthenticatedActor = { userId: "coord-1", role: "COORDINATOR", batchScope: [] };

function record(overrides: Partial<RecruiterAccountRecord> = {}): RecruiterAccountRecord {
  return {
    id: overrides.id ?? "rec-record-1",
    userId: overrides.userId ?? "user-1",
    email: overrides.email ?? "alice@studio.com",
    fullName: overrides.fullName ?? "Alice Recruiter",
    companyName: overrides.companyName ?? "Studio",
    isActive: overrides.isActive ?? true,
    approvalStatus: overrides.approvalStatus ?? "APPROVED",
    createdAt: overrides.createdAt ?? new Date(),
  };
}

describe("SearchRecruiterAccountsUseCase", () => {
  it("rejects a non-Secretary actor", async () => {
    const recruiterAccountRepository = new InMemoryRecruiterAccountRepository();
    const useCase = new SearchRecruiterAccountsUseCase({ recruiterAccountRepository });
    await expect(useCase.execute({ actor: COORDINATOR, filters: {} })).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  it("excludes inactive recruiters by default, includes them when includeInactive is set", async () => {
    const recruiterAccountRepository = new InMemoryRecruiterAccountRepository();
    recruiterAccountRepository.seed(record({ id: "active-1", isActive: true }));
    recruiterAccountRepository.seed(record({ id: "inactive-1", isActive: false }));
    const useCase = new SearchRecruiterAccountsUseCase({ recruiterAccountRepository });

    const defaultResults = await useCase.execute({ actor: SECRETARY, filters: {} });
    expect(defaultResults).toHaveLength(1);

    const allResults = await useCase.execute({ actor: SECRETARY, filters: { includeInactive: true } });
    expect(allResults).toHaveLength(2);
  });
});

describe("GetRecruiterAccountUseCase", () => {
  it("throws RecruiterAccountNotFoundError for an unknown id", async () => {
    const recruiterAccountRepository = new InMemoryRecruiterAccountRepository();
    const useCase = new GetRecruiterAccountUseCase({ recruiterAccountRepository });
    await expect(useCase.execute({ actor: SECRETARY, recruiterId: "missing" })).rejects.toBeInstanceOf(
      RecruiterAccountNotFoundError,
    );
  });

  it("returns the recruiter when found", async () => {
    const recruiterAccountRepository = new InMemoryRecruiterAccountRepository();
    recruiterAccountRepository.seed(record({ id: "rec-record-1" }));
    const useCase = new GetRecruiterAccountUseCase({ recruiterAccountRepository });
    const result = await useCase.execute({ actor: SECRETARY, recruiterId: "rec-record-1" });
    expect(result.id).toBe("rec-record-1");
  });
});

describe("UpdateRecruiterAccountUseCase", () => {
  let recruiterAccountRepository: InMemoryRecruiterAccountRepository;
  let auditRecorder: FakeAuditRecorder;
  let useCase: UpdateRecruiterAccountUseCase;

  beforeEach(() => {
    recruiterAccountRepository = new InMemoryRecruiterAccountRepository();
    recruiterAccountRepository.seed(record({ id: "rec-record-1" }));
    auditRecorder = new FakeAuditRecorder();
    useCase = new UpdateRecruiterAccountUseCase({ recruiterAccountRepository, auditRecorder });
  });

  it("rejects a non-Secretary actor", async () => {
    await expect(
      useCase.execute({ actor: COORDINATOR, recruiterId: "rec-record-1", fullName: "New Name" }),
    ).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  it("updates the full name and company name", async () => {
    const result = await useCase.execute({
      actor: SECRETARY,
      recruiterId: "rec-record-1",
      fullName: "New Name",
      companyName: "New Studio",
    });
    expect(result.fullName).toBe("New Name");
    expect(result.companyName).toBe("New Studio");
  });

  it("records a RECRUITER_UPDATED audit entry", async () => {
    await useCase.execute({ actor: SECRETARY, recruiterId: "rec-record-1", fullName: "New Name" });
    expect(auditRecorder.entries).toContainEqual(expect.objectContaining({ action: "RECRUITER_UPDATED" }));
  });
});

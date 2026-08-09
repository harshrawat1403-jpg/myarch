import { beforeEach, describe, expect, it } from "vitest";
import { CreateCompanyUseCase } from "../../../src/modules/companies/application/use-cases/create-company";
import { UpdateCompanyUseCase } from "../../../src/modules/companies/application/use-cases/update-company";
import { CompanyNotFoundError, DuplicateCompanyNameError } from "../../../src/modules/companies/domain/errors";
import { NotAuthorizedError } from "../../../src/lib/errors";
import { InMemoryCompanyRepository } from "../../support/fakes/in-memory-company-repository";
import { FakeAuditRecorder } from "../../support/fakes/fake-audit-recorder";
import type { AuthenticatedActor } from "../../../src/modules/auth";

const SECRETARY: AuthenticatedActor = { userId: "sec-1", role: "SECRETARY" };
const COORDINATOR: AuthenticatedActor = { userId: "coord-1", role: "COORDINATOR", batchScope: [] };

describe("CreateCompanyUseCase", () => {
  let companyRepository: InMemoryCompanyRepository;
  let auditRecorder: FakeAuditRecorder;
  let useCase: CreateCompanyUseCase;

  beforeEach(() => {
    companyRepository = new InMemoryCompanyRepository();
    auditRecorder = new FakeAuditRecorder();
    useCase = new CreateCompanyUseCase({ companyRepository, auditRecorder });
  });

  it("rejects a Coordinator (V4.0 A4: Secretary-managed, Coordinator-viewable)", async () => {
    await expect(useCase.execute({ actor: COORDINATOR, name: "Acme Studio" })).rejects.toBeInstanceOf(
      NotAuthorizedError,
    );
  });

  it("creates a company for the Secretary", async () => {
    const company = await useCase.execute({ actor: SECRETARY, name: "Acme Studio", sector: "Architecture" });
    expect(company.name).toBe("Acme Studio");
    expect(company.sector).toBe("Architecture");
    expect(company.isActive).toBe(true);
  });

  it("rejects a duplicate name, case-insensitively", async () => {
    await useCase.execute({ actor: SECRETARY, name: "Acme Studio" });
    await expect(useCase.execute({ actor: SECRETARY, name: "ACME STUDIO" })).rejects.toBeInstanceOf(
      DuplicateCompanyNameError,
    );
  });

  it("records a COMPANY_CREATED audit entry", async () => {
    await useCase.execute({ actor: SECRETARY, name: "Acme Studio" });
    expect(auditRecorder.entries).toContainEqual(
      expect.objectContaining({ actorUserId: "sec-1", action: "COMPANY_CREATED" }),
    );
  });
});

describe("UpdateCompanyUseCase", () => {
  let companyRepository: InMemoryCompanyRepository;
  let auditRecorder: FakeAuditRecorder;
  let useCase: UpdateCompanyUseCase;

  beforeEach(async () => {
    companyRepository = new InMemoryCompanyRepository();
    auditRecorder = new FakeAuditRecorder();
    useCase = new UpdateCompanyUseCase({ companyRepository, auditRecorder });
    await companyRepository.create({ name: "Acme Studio", sector: "Architecture" });
  });

  it("rejects a Coordinator", async () => {
    const [existing] = await companyRepository.search({ includeInactive: true });
    await expect(
      useCase.execute({ actor: COORDINATOR, companyId: existing!.id, name: "New Name" }),
    ).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  it("updates the name/sector/website for the Secretary", async () => {
    const [existing] = await companyRepository.search({ includeInactive: true });
    const updated = await useCase.execute({
      actor: SECRETARY,
      companyId: existing!.id,
      website: "https://acme.example",
    });
    expect(updated.website).toBe("https://acme.example");
    expect(updated.name).toBe("Acme Studio");
  });

  it("throws CompanyNotFoundError for an unknown id", async () => {
    await expect(
      useCase.execute({ actor: SECRETARY, companyId: "missing", name: "New Name" }),
    ).rejects.toBeInstanceOf(CompanyNotFoundError);
  });

  it("rejects renaming to a name already used by a different company", async () => {
    await companyRepository.create({ name: "Other Studio" });
    const [acme] = await companyRepository.search({ includeInactive: true });
    await expect(
      useCase.execute({ actor: SECRETARY, companyId: acme!.id, name: "Other Studio" }),
    ).rejects.toBeInstanceOf(DuplicateCompanyNameError);
  });

  it("allows 'renaming' to the same name it already has", async () => {
    const [existing] = await companyRepository.search({ includeInactive: true });
    await expect(
      useCase.execute({ actor: SECRETARY, companyId: existing!.id, name: "Acme Studio" }),
    ).resolves.toMatchObject({ name: "Acme Studio" });
  });

  it("clears sector/website when explicitly set to null", async () => {
    const [existing] = await companyRepository.search({ includeInactive: true });
    const updated = await useCase.execute({ actor: SECRETARY, companyId: existing!.id, sector: null });
    expect(updated.sector).toBeNull();
  });

  it("records a COMPANY_UPDATED audit entry", async () => {
    const [existing] = await companyRepository.search({ includeInactive: true });
    await useCase.execute({ actor: SECRETARY, companyId: existing!.id, name: "Renamed Studio" });
    expect(auditRecorder.entries).toContainEqual(
      expect.objectContaining({ actorUserId: "sec-1", action: "COMPANY_UPDATED" }),
    );
  });
});

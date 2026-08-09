import { beforeEach, describe, expect, it } from "vitest";
import { SetCompanyActiveUseCase } from "../../../src/modules/companies/application/use-cases/set-company-active";
import { SearchCompaniesUseCase } from "../../../src/modules/companies/application/use-cases/search-companies";
import { GetCompanyUseCase } from "../../../src/modules/companies/application/use-cases/get-company";
import {
  CompanyAlreadyActiveError,
  CompanyAlreadyDisabledError,
  CompanyNotFoundError,
} from "../../../src/modules/companies/domain/errors";
import { NotAuthorizedError } from "../../../src/lib/errors";
import { InMemoryCompanyRepository } from "../../support/fakes/in-memory-company-repository";
import { FakeAuditRecorder } from "../../support/fakes/fake-audit-recorder";
import type { AuthenticatedActor } from "../../../src/modules/auth";

const SECRETARY: AuthenticatedActor = { userId: "sec-1", role: "SECRETARY" };
const COORDINATOR: AuthenticatedActor = { userId: "coord-1", role: "COORDINATOR", batchScope: [] };
const STUDENT: AuthenticatedActor = { userId: "stu-1", role: "STUDENT", studentProfileId: "s-1" };

describe("SetCompanyActiveUseCase", () => {
  let companyRepository: InMemoryCompanyRepository;
  let useCase: SetCompanyActiveUseCase;

  beforeEach(async () => {
    companyRepository = new InMemoryCompanyRepository();
    useCase = new SetCompanyActiveUseCase({ companyRepository, auditRecorder: new FakeAuditRecorder() });
    await companyRepository.create({ name: "Acme Studio" });
  });

  it("rejects a Coordinator from disabling a company", async () => {
    const [existing] = await companyRepository.search({ includeInactive: true });
    await expect(
      useCase.execute({ actor: COORDINATOR, companyId: existing!.id, isActive: false }),
    ).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  it("disables then re-enables for the Secretary", async () => {
    const [existing] = await companyRepository.search({ includeInactive: true });
    const disabled = await useCase.execute({ actor: SECRETARY, companyId: existing!.id, isActive: false });
    expect(disabled.isActive).toBe(false);

    const enabled = await useCase.execute({ actor: SECRETARY, companyId: existing!.id, isActive: true });
    expect(enabled.isActive).toBe(true);
  });

  it("rejects disabling an already-disabled company", async () => {
    const [existing] = await companyRepository.search({ includeInactive: true });
    await useCase.execute({ actor: SECRETARY, companyId: existing!.id, isActive: false });
    await expect(
      useCase.execute({ actor: SECRETARY, companyId: existing!.id, isActive: false }),
    ).rejects.toBeInstanceOf(CompanyAlreadyDisabledError);
  });

  it("rejects enabling an already-active company", async () => {
    const [existing] = await companyRepository.search({ includeInactive: true });
    await expect(
      useCase.execute({ actor: SECRETARY, companyId: existing!.id, isActive: true }),
    ).rejects.toBeInstanceOf(CompanyAlreadyActiveError);
  });

  it("throws CompanyNotFoundError for an unknown id", async () => {
    await expect(
      useCase.execute({ actor: SECRETARY, companyId: "missing", isActive: false }),
    ).rejects.toBeInstanceOf(CompanyNotFoundError);
  });
});

describe("SearchCompaniesUseCase", () => {
  it("allows Secretary and Coordinator, denies Student", async () => {
    const companyRepository = new InMemoryCompanyRepository();
    await companyRepository.create({ name: "Active Co" });
    const useCase = new SearchCompaniesUseCase({ companyRepository });

    await expect(useCase.execute({ actor: SECRETARY, filters: {} })).resolves.toHaveLength(1);
    await expect(useCase.execute({ actor: COORDINATOR, filters: {} })).resolves.toHaveLength(1);
    await expect(useCase.execute({ actor: STUDENT, filters: {} })).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  it("excludes inactive companies by default, includes them when includeInactive is set", async () => {
    const companyRepository = new InMemoryCompanyRepository();
    const created = await companyRepository.create({ name: "Disabled Co" });
    await companyRepository.setActive(created.id, false);
    const useCase = new SearchCompaniesUseCase({ companyRepository });

    await expect(useCase.execute({ actor: SECRETARY, filters: {} })).resolves.toHaveLength(0);
    await expect(useCase.execute({ actor: SECRETARY, filters: { includeInactive: true } })).resolves.toHaveLength(1);
  });
});

describe("GetCompanyUseCase", () => {
  it("allows Secretary and Coordinator, denies Student", async () => {
    const companyRepository = new InMemoryCompanyRepository();
    const created = await companyRepository.create({ name: "Acme Studio" });
    const useCase = new GetCompanyUseCase({ companyRepository });

    await expect(useCase.execute({ actor: SECRETARY, companyId: created.id })).resolves.toMatchObject({
      name: "Acme Studio",
    });
    await expect(useCase.execute({ actor: COORDINATOR, companyId: created.id })).resolves.toMatchObject({
      name: "Acme Studio",
    });
    await expect(useCase.execute({ actor: STUDENT, companyId: created.id })).rejects.toBeInstanceOf(
      NotAuthorizedError,
    );
  });

  it("throws CompanyNotFoundError for an unknown id", async () => {
    const companyRepository = new InMemoryCompanyRepository();
    const useCase = new GetCompanyUseCase({ companyRepository });
    await expect(useCase.execute({ actor: SECRETARY, companyId: "missing" })).rejects.toBeInstanceOf(
      CompanyNotFoundError,
    );
  });
});

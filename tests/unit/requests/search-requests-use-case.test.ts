import { beforeEach, describe, expect, it } from "vitest";
import { SearchRequestsUseCase } from "../../../src/modules/requests/application/use-cases/search-requests";
import { InMemoryRequestRepository } from "../../support/fakes/in-memory-request-repository";
import type { AuthenticatedActor } from "../../../src/modules/auth";
import type { RequestRecord } from "../../../src/modules/requests";

const SECRETARY: AuthenticatedActor = { userId: "sec-1", role: "SECRETARY" };
const VIEW_COORDINATOR: AuthenticatedActor = { userId: "coord-1", role: "COORDINATOR", batchScope: [], permissions: ["requests.view"] };
const UNPRIVILEGED_COORDINATOR: AuthenticatedActor = { userId: "coord-2", role: "COORDINATOR", batchScope: [], permissions: [] };
const STUDENT: AuthenticatedActor = { userId: "stu-1", role: "STUDENT", studentProfileId: "sp-1" };
const RECRUITER: AuthenticatedActor = { userId: "rec-1", role: "RECRUITER" };

function record(overrides: Partial<RequestRecord>): RequestRecord {
  const now = new Date();
  return {
    id: overrides.id ?? "x",
    type: "Equipment loan",
    description: "x",
    priority: "MEDIUM",
    status: "SUBMITTED",
    requesterId: "stu-1",
    ownerId: null,
    deadline: null,
    taskId: null,
    decision: null,
    decisionReason: null,
    decidedAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("SearchRequestsUseCase — role-based scoping (authorization)", () => {
  let repo: InMemoryRequestRepository;
  let useCase: SearchRequestsUseCase;

  beforeEach(() => {
    repo = new InMemoryRequestRepository();
    repo.seed(record({ id: "r1", requesterId: "stu-1", ownerId: "coord-2" }));
    repo.seed(record({ id: "r2", requesterId: "stu-2", ownerId: "coord-9" }));
    useCase = new SearchRequestsUseCase({ requestRepository: repo });
  });

  it("Secretary sees every request", async () => {
    const result = await useCase.execute({ actor: SECRETARY });
    expect(result.total).toBe(2);
  });

  it("a requests.view Coordinator sees every request", async () => {
    const result = await useCase.execute({ actor: VIEW_COORDINATOR });
    expect(result.total).toBe(2);
  });

  it("an unprivileged Coordinator sees only requests they own", async () => {
    const result = await useCase.execute({ actor: UNPRIVILEGED_COORDINATOR });
    expect(result.items.map((r) => r.id)).toEqual(["r1"]);
  });

  it("a Student sees only requests they submitted, overriding any explicit requesterId filter", async () => {
    const result = await useCase.execute({ actor: STUDENT, filters: { requesterId: "stu-2" } });
    expect(result.items.map((r) => r.id)).toEqual(["r1"]);
  });

  it("a Recruiter gets an empty result, not an error", async () => {
    const result = await useCase.execute({ actor: RECRUITER });
    expect(result.total).toBe(0);
  });
});

describe("SearchRequestsUseCase — pagination", () => {
  it("paginates correctly and reports total", async () => {
    const repo = new InMemoryRequestRepository();
    for (let i = 0; i < 23; i++) repo.seed(record({ id: `bulk-${i}` }));
    const useCase = new SearchRequestsUseCase({ requestRepository: repo });

    const page1 = await useCase.execute({ actor: SECRETARY, page: 1, pageSize: 10 });
    expect(page1.items).toHaveLength(10);
    expect(page1.total).toBe(23);

    const page3 = await useCase.execute({ actor: SECRETARY, page: 3, pageSize: 10 });
    expect(page3.items).toHaveLength(3);
  });
});

import { beforeEach, describe, expect, it } from "vitest";
import { SearchTasksUseCase } from "../../../src/modules/tasks/application/use-cases/search-tasks";
import { InMemoryTaskRepository } from "../../support/fakes/in-memory-task-repository";
import type { TaskRecord } from "../../../src/modules/tasks";
import type { AuthenticatedActor } from "../../../src/modules/auth";

const SECRETARY: AuthenticatedActor = { userId: "sec-1", role: "SECRETARY" };
const COORDINATOR: AuthenticatedActor = { userId: "coord-1", role: "COORDINATOR", batchScope: [] };
const STUDENT_OWNER: AuthenticatedActor = { userId: "stu-1", role: "STUDENT", studentProfileId: "sp-1" };
const OTHER_STUDENT: AuthenticatedActor = { userId: "stu-2", role: "STUDENT", studentProfileId: "sp-2" };
const RECRUITER: AuthenticatedActor = { userId: "rec-1", role: "RECRUITER" };

function record(overrides: Partial<TaskRecord>): TaskRecord {
  const now = new Date();
  return {
    id: overrides.id ?? "task-x",
    title: "Task",
    description: null,
    status: "TODO",
    priority: "MEDIUM",
    ownerId: "stu-1",
    creatorId: "coord-1",
    deadline: null,
    reminderAt: null,
    escalatedAt: null,
    escalatedToId: null,
    relatedEntityType: null,
    relatedEntityId: null,
    completedAt: null,
    cancelledAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("SearchTasksUseCase — role-based scoping", () => {
  let taskRepository: InMemoryTaskRepository;
  let useCase: SearchTasksUseCase;

  beforeEach(() => {
    taskRepository = new InMemoryTaskRepository();
    // Owned + created by coord-1/stu-1
    taskRepository.seed(record({ id: "t1", ownerId: "stu-1", creatorId: "coord-1" }));
    // Unrelated to coord-1/stu-1 entirely
    taskRepository.seed(record({ id: "t2", ownerId: "stu-2", creatorId: "coord-2" }));
    // Created by coord-1 but owned by someone else
    taskRepository.seed(record({ id: "t3", ownerId: "stu-2", creatorId: "coord-1" }));
    useCase = new SearchTasksUseCase({ taskRepository });
  });

  it("Secretary sees every task, unscoped", async () => {
    const result = await useCase.execute({ actor: SECRETARY });
    expect(result.total).toBe(3);
  });

  it("Coordinator sees only tasks they own or created", async () => {
    const result = await useCase.execute({ actor: COORDINATOR });
    expect(result.items.map((t) => t.id).sort()).toEqual(["t1", "t3"]);
  });

  it("Student sees only tasks they own, and cannot widen via an explicit ownerId filter", async () => {
    const result = await useCase.execute({ actor: STUDENT_OWNER, filters: { ownerId: "stu-2" } });
    expect(result.items.map((t) => t.id)).toEqual(["t1"]);
  });

  it("a Student who owns none of the seeded tasks sees nothing", async () => {
    const UNINVOLVED_STUDENT: AuthenticatedActor = { userId: "stu-9", role: "STUDENT", studentProfileId: "sp-9" };
    const result = await useCase.execute({ actor: UNINVOLVED_STUDENT });
    expect(result.total).toBe(0);
  });

  it("a Student who owns tasks sees only those, even ones they didn't create", async () => {
    const result = await useCase.execute({ actor: OTHER_STUDENT });
    expect(result.items.map((t) => t.id).sort()).toEqual(["t2", "t3"]);
  });

  it("Recruiter gets an empty result, not an error", async () => {
    const result = await useCase.execute({ actor: RECRUITER });
    expect(result.total).toBe(0);
    expect(result.items).toEqual([]);
  });
});

describe("SearchTasksUseCase — filtering", () => {
  let taskRepository: InMemoryTaskRepository;
  let useCase: SearchTasksUseCase;

  beforeEach(() => {
    taskRepository = new InMemoryTaskRepository();
    taskRepository.seed(record({ id: "t1", status: "TODO", priority: "LOW" }));
    taskRepository.seed(record({ id: "t2", status: "DONE", priority: "HIGH" }));
    taskRepository.seed(
      record({ id: "t3", status: "IN_PROGRESS", priority: "URGENT", deadline: new Date(Date.now() - 60_000) }),
    );
    useCase = new SearchTasksUseCase({ taskRepository });
  });

  it("filters by status", async () => {
    const result = await useCase.execute({ actor: SECRETARY, filters: { status: "DONE" } });
    expect(result.items.map((t) => t.id)).toEqual(["t2"]);
  });

  it("filters by priority", async () => {
    const result = await useCase.execute({ actor: SECRETARY, filters: { priority: "URGENT" } });
    expect(result.items.map((t) => t.id)).toEqual(["t3"]);
  });

  it("filters overdueOnly — past deadline and still active", async () => {
    const result = await useCase.execute({ actor: SECRETARY, filters: { overdueOnly: true } });
    expect(result.items.map((t) => t.id)).toEqual(["t3"]);
  });
});

describe("SearchTasksUseCase — pagination", () => {
  it("paginates and reports total independent of page size", async () => {
    const taskRepository = new InMemoryTaskRepository();
    for (let i = 0; i < 25; i++) {
      taskRepository.seed(record({ id: `t${i}` }));
    }
    const useCase = new SearchTasksUseCase({ taskRepository });

    const page1 = await useCase.execute({ actor: SECRETARY, page: 1, pageSize: 10 });
    expect(page1.items).toHaveLength(10);
    expect(page1.total).toBe(25);
    expect(page1.page).toBe(1);

    const page3 = await useCase.execute({ actor: SECRETARY, page: 3, pageSize: 10 });
    expect(page3.items).toHaveLength(5);
  });

  it("clamps an out-of-range pageSize to MAX_PAGE_SIZE", async () => {
    const taskRepository = new InMemoryTaskRepository();
    taskRepository.seed(record({ id: "t1" }));
    const useCase = new SearchTasksUseCase({ taskRepository });

    const result = await useCase.execute({ actor: SECRETARY, pageSize: 9999 });
    expect(result.pageSize).toBe(100);
  });
});

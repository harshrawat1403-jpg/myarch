import { describe, expect, it, vi } from "vitest";
import { ElectionUseCases } from "../../../src/modules/elections/application/election-use-cases";
import { electionConfigSchema } from "../../../src/modules/elections/domain/election";
import { NotAuthorizedError } from "../../../src/lib/errors";
import type { AuthenticatedActor } from "../../../src/modules/auth";
import type { ElectionRepository } from "../../../src/modules/elections/application/ports/election-repository";

const secretary: AuthenticatedActor = { role: "SECRETARY", userId: "secretary" };
const student: AuthenticatedActor = { role: "STUDENT", userId: "student" };
const config = electionConfigSchema.parse({
  title: "Council",
  type: "COUNCIL",
  academicYear: "2026-2027",
  applicationOpenAt: "2026-09-01",
  applicationCloseAt: "2026-09-10",
});
function setup() {
  const record = { ...config, id: "election", status: "APPLICATION_OPEN" };
  const repository = {
    list: vi.fn().mockResolvedValue([]),
    get: vi.fn().mockResolvedValue(record),
    create: vi.fn().mockResolvedValue(record),
    update: vi.fn().mockResolvedValue(record),
    savePosition: vi.fn().mockResolvedValue(record),
    deletePosition: vi.fn(),
    linkForm: vi.fn(),
    transition: vi.fn().mockResolvedValue(record),
    candidates: vi.fn().mockResolvedValue([]),
    activeStudentUserIds: vi.fn().mockResolvedValue(["student"]),
    closeVoting: vi.fn(),
    countResults: vi.fn(),
    results: vi.fn(),
  };
  const notifications = { notify: vi.fn() };
  return {
    repository,
    notifications,
    useCases: new ElectionUseCases(repository as unknown as ElectionRepository, notifications),
  };
}
describe("election use cases and permissions", () => {
  it("creates and updates an election with normalized validated configuration", async () => {
    const { useCases, repository } = setup();
    await useCases.create(secretary, config);
    await useCases.update(secretary, "election", config);
    expect(repository.create).toHaveBeenCalledWith(config, "secretary");
    expect(repository.update).toHaveBeenCalledWith("election", config, "secretary");
  });
  it("creates and updates positions and associates a form", async () => {
    const { useCases, repository } = setup();
    const position = { title: "President", seats: 1 };
    await useCases.savePosition(secretary, "election", null, position);
    await useCases.savePosition(secretary, "election", "position", position);
    await useCases.linkForm(secretary, "election", "form");
    expect(repository.savePosition).toHaveBeenCalledTimes(2);
    expect(repository.linkForm).toHaveBeenCalledWith("election", "form", "secretary");
  });
  it("announces successful opening once, with no duplicated submission notifications", async () => {
    const { useCases, notifications, repository } = setup();
    await useCases.transition(secretary, "election", "APPLICATION_OPEN");
    expect(notifications.notify).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientUserId: "student",
        template: "ELECTION_APPLICATION_OPENED",
      }),
    );
    repository.transition.mockRejectedValueOnce(new Error("Concurrent opening lost"));
    await expect(useCases.transition(secretary, "election", "APPLICATION_OPEN")).rejects.toThrow();
    expect(notifications.notify).toHaveBeenCalledTimes(1);
    await useCases.transition(secretary, "election", "APPLICATION_CLOSED");
    expect(notifications.notify).toHaveBeenCalledTimes(1);
  });
  it.each(["COORDINATOR", "STUDENT", "RECRUITER", "ALUMNI"] as const)(
    "denies %s every administrative use case before repository access",
    async (role) => {
      const { useCases, repository } = setup();
      const actor = {
        role,
        userId: "other",
        permissions: ["applications.view", "applications.review"],
      };
      for (const operation of [
        () => useCases.create(actor, config),
        () => useCases.update(actor, "election", config),
        () => useCases.savePosition(actor, "election", null, {}),
        () => useCases.deletePosition(actor, "election", "position"),
        () => useCases.linkForm(actor, "election", "form"),
        () => useCases.transition(actor, "election", "APPLICATION_OPEN"),
        () => useCases.closeVoting(actor, "election"),
        () => useCases.countResults(actor, "election"),
        () => useCases.results(actor, "election"),
      ])
        await expect(operation()).rejects.toBeInstanceOf(NotAuthorizedError);
      for (const method of [
        repository.create,
        repository.update,
        repository.savePosition,
        repository.deletePosition,
        repository.linkForm,
        repository.transition,
        repository.closeVoting,
        repository.countResults,
        repository.results,
      ])
        expect(method).not.toHaveBeenCalled();
    },
  );
  it.each(["COORDINATOR", "RECRUITER", "ALUMNI"] as const)(
    "denies %s election reads",
    async (role) => {
      const { useCases } = setup();
      await expect(useCases.list({ role, userId: "other" })).rejects.toBeInstanceOf(
        NotAuthorizedError,
      );
    },
  );
  it("scopes student candidates to their own user ID and hides drafts", async () => {
    const { useCases, repository } = setup();
    await useCases.candidates(student, "election");
    expect(repository.candidates).toHaveBeenCalledWith("election", "student");
    await useCases.candidates(secretary, "election");
    expect(repository.candidates).toHaveBeenLastCalledWith("election", undefined);
    repository.get.mockResolvedValueOnce({ ...config, id: "election", status: "DRAFT" });
    await expect(useCases.get(student, "election")).rejects.toThrow("not found");
  });
});

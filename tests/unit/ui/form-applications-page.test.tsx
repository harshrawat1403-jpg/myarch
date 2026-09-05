// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ fetch: vi.fn() }));

vi.mock("@/modules/auth/client", () => ({
  useAuth: () => ({ accessToken: "test-token", role: "SECRETARY" }),
}));

import FormApplicationsPage from "../../../src/app/(admin)/dashboard/form-applications/page";

const generic = {
  id: "generic",
  formTitle: "Generic intake",
  applicantName: "Student",
  currentStatus: "UNDER_REVIEW",
  electionId: null,
  selectionId: null,
};
const election = {
  id: "election",
  formTitle: "Council application",
  applicantName: "Student",
  currentStatus: "UNDER_REVIEW",
  electionId: "election-1",
  selectionId: null,
};
const selection = {
  id: "selection",
  formTitle: "Core Committee application",
  applicantName: "Student",
  currentStatus: "UNDER_REVIEW",
  electionId: null,
  selectionId: "selection-1",
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", state.fetch);
  state.fetch.mockImplementation(async (path: string) => {
    if (path === "/api/applications")
      return { ok: true, json: async () => ({ data: [generic, election, selection] }) };
    const item = [generic, election, selection].find(
      (value) => path === `/api/applications/${value.id}`,
    );
    if (!item) throw new Error(`Unexpected request: ${path}`);
    return {
      ok: true,
      json: async () => ({
        data: {
          ...item,
          submissionId: `${item.id}-submission`,
          formId: "form-1",
          applicantUserId: "student-1",
          studentProfileId: "profile-1",
          decisionReason: null,
          decidedByUserId: null,
          decidedAt: null,
          submittedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          fields: [],
          answers: {},
          applicantBatchId: "batch-1",
          reviewers: [],
          reviews: [],
          statusEvents: [],
        },
      }),
    };
  });
});

describe("generic application review controls", () => {
  it("keeps generic controls available and suppresses them for election and Core Committee selection applications", async () => {
    const user = userEvent.setup();
    render(<FormApplicationsPage />);

    await user.click(await screen.findByRole("button", { name: /Generic intake/ }));
    expect(screen.getByLabelText("Assign reviewer user ID")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Record review" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Select" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Council application/ }));
    expect(screen.queryByLabelText("Assign reviewer user ID")).not.toBeInTheDocument();
    expect(screen.getByText(/Election application received/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Core Committee application/ }));
    expect(screen.queryByLabelText("Assign reviewer user ID")).not.toBeInTheDocument();
    expect(screen.getByText(/Core Committee selection application received/)).toBeInTheDocument();
  });
});

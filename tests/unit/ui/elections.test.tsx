// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ role: "STUDENT", fetch: vi.fn() }));
vi.mock("@/modules/auth/client", () => ({
  useAuth: () => ({ accessToken: "test-token", role: state.role }),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
import StudentElectionsPage from "../../../src/app/(student)/student/elections/page";
import { ElectionAdmin } from "../../../src/components/elections/election-admin";
import { ElectionConfigForm } from "../../../src/components/elections/election-config-form";

const election = {
  id: "election",
  title: "Student Council 2026",
  academicYear: "2026-2027",
  type: "COUNCIL",
  status: "APPLICATION_OPEN",
  applicationOpenAt: new Date(Date.now() - 60000).toISOString(),
  applicationCloseAt: new Date(Date.now() + 3600000).toISOString(),
  maxPositionsPerCandidate: 1,
  applicationForm: { formId: "form" },
  positions: [
    {
      id: "position",
      title: "President",
      description: "Represent the students",
      seats: 1,
      weights: [{ voterGroup: "STUDENT", percentage: 60 }],
    },
  ],
};
const fields = [
  {
    id: "field",
    key: "motivation",
    label: "Motivation",
    type: "TEXT",
    required: true,
    options: [],
    validation: null,
  },
];
beforeEach(() => {
  vi.clearAllMocks();
  state.role = "STUDENT";
  vi.stubGlobal("fetch", state.fetch);
});
describe("election application UI", () => {
  it("uses the existing form submission route and then displays own candidacy", async () => {
    let submitted = false;
    state.fetch.mockImplementation(
      async (path: string, options?: { method?: string; body?: string }) => {
        let data: unknown;
        if (path === "/api/elections") data = [election];
        else if (path === "/api/elections/election") data = election;
        else if (path.endsWith("/candidates"))
          data = submitted
            ? [
                {
                  id: "candidate",
                  applicationId: "application",
                  status: "APPLIED",
                  positions: [{ title: "President" }],
                },
              ]
            : [];
        else if (path === "/api/forms/form/applications" && options?.method === "POST") {
          submitted = true;
          data = { id: "application" };
        } else if (path === "/api/forms/form") data = { id: "form", fields };
        else if (path === "/api/applications/application")
          data = { fields, answers: { motivation: "I want to help" } };
        else throw new Error(`Unexpected request: ${path}`);
        return { ok: true, json: async () => ({ data }) };
      },
    );
    const user = userEvent.setup();
    render(<StudentElectionsPage />);
    await user.click(
      await screen.findByRole("button", { name: "View election and my application" }),
    );
    await user.click(await screen.findByRole("checkbox", { name: "President" }));
    await user.type(screen.getByLabelText(/Motivation/), "I want to help");
    await user.click(screen.getByRole("button", { name: "Submit election application" }));
    expect(await screen.findByText("My candidacy")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText(/Motivation/)).toBeDisabled());
    const post = state.fetch.mock.calls.find(([path]) => path === "/api/forms/form/applications");
    expect(JSON.parse(post![1].body)).toEqual({
      answers: { motivation: "I want to help" },
      electionPositionIds: ["position"],
    });
    expect(state.fetch).toHaveBeenCalledWith("/api/applications/application", expect.anything());
  });
  it("does not expose application intake after the deadline", async () => {
    const closed = { ...election, applicationCloseAt: new Date(Date.now() - 1000).toISOString() };
    state.fetch.mockImplementation(async (path: string) => ({
      ok: true,
      json: async () => ({
        data:
          path === "/api/elections"
            ? [closed]
            : path.endsWith("/candidates")
              ? []
              : path === "/api/forms/form"
                ? { id: "form", fields }
                : closed,
      }),
    }));
    render(<StudentElectionsPage />);
    fireEvent.click(
      await screen.findByRole("button", { name: "View election and my application" }),
    );
    expect(await screen.findByText(/Applications are currently closed/)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Submit election application" }),
    ).not.toBeInTheDocument();
  });
  it("submits a Council-only secret ballot without displaying it after participation", async () => {
    const voting = { ...election, status: "VOTING" };
    let cast = false;
    state.fetch.mockImplementation(
      async (path: string, options?: { method?: string; body?: string }) => {
        let data: unknown;
        if (path === "/api/elections") data = [voting];
        else if (path === "/api/elections/election") data = voting;
        else if (path.endsWith("/candidates")) data = [];
        else if (path.endsWith("/ballot") && options?.method === "POST") {
          cast = true;
          data = { submitted: true };
        } else if (path.endsWith("/ballot"))
          data = {
            voterGroup: "STUDENT",
            participation: cast ? { status: "CAST" } : null,
            notaEnabled: true,
            positions: [
              {
                id: "position",
                title: "President",
                seats: 1,
                candidates: [{ id: "candidate", name: "Candidate One" }],
              },
            ],
          };
        else throw new Error(`Unexpected request: ${path}`);
        return { ok: true, json: async () => ({ data }) };
      },
    );
    const user = userEvent.setup();
    render(<StudentElectionsPage />);
    await user.click(
      await screen.findByRole("button", { name: "View election and my application" }),
    );
    await user.click(await screen.findByRole("radio", { name: "Candidate One" }));
    await user.click(screen.getByRole("button", { name: "Submit secret ballot" }));
    expect(await screen.findByText("You have submitted a ballot.")).toBeInTheDocument();
    const post = state.fetch.mock.calls.find(
      ([path, options]) => path === "/api/elections/election/ballot" && options?.method === "POST",
    );
    expect(post).toBeTruthy();
    expect(screen.queryByText("Candidate One")).not.toBeInTheDocument();
  });
  it("keeps Coordinators out of administration without fetching election data", () => {
    state.role = "COORDINATOR";
    render(<ElectionAdmin />);
    expect(screen.getByText("Only the Secretary may administer elections.")).toBeInTheDocument();
    expect(state.fetch).not.toHaveBeenCalled();
  });
  it("disables opened election configuration and omits its save action", () => {
    render(<ElectionConfigForm election={election as never} busy={false} onSave={vi.fn()} />);
    expect(screen.getByLabelText("Election title")).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Save configuration" })).not.toBeInTheDocument();
  });
});

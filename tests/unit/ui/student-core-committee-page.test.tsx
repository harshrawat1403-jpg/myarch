// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ fetch: vi.fn(), id: "selection-1" }));
vi.mock("@/modules/auth/client", () => ({ useAuth: () => ({ accessToken: "student-token" }) }));
vi.mock("next/navigation", () => ({ useParams: () => ({ id: state.id }) }));

import StudentCoreCommitteePage from "../../../src/app/(student)/student/core-committee/page";
import StudentCoreCommitteeDetailPage from "../../../src/app/(student)/student/core-committee/[id]/page";

const selection = {
  id: "selection-1",
  title: "Core Committee 2026",
  brief: "A long application brief\nwith readable line breaks.",
  status: "APPLICATION_OPEN",
  applicationOpenAt: new Date(Date.now() - 60_000).toISOString(),
  applicationCloseAt: new Date(Date.now() + 3_600_000).toISOString(),
  positions: [
    { id: "domain-1", title: "Technical Coordinator", description: "Maintain digital systems.\nCoordinate technical work.", seats: 2, displayOrder: 0, questions: [] },
    { id: "domain-2", title: "Design Coordinator", description: "Coordinate visual communication.", seats: 1, displayOrder: 1, questions: [{ id: "field-1", key: "motivation", label: "Why this domain?", type: "LONG_TEXT", description: null, required: true, options: [], validation: null, displayOrder: 0 }] },
  ],
  application: null,
};

function response(data: unknown) {
  return Promise.resolve({ ok: true, status: 200, json: async () => ({ data }) });
}

describe("student Core Committee application UI", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", state.fetch);
  });

  it("keeps Core Committee applications on their own catalogue", async () => {
    state.fetch.mockImplementation((path: string) => {
      if (path === "/api/student/core-committee-selections") return response([{ ...selection, positions: undefined }]);
      throw new Error(`Unexpected request: ${path}`);
    });
    render(<StudentCoreCommitteePage />);
    expect(await screen.findByText("Core Committee 2026")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Explore domains" })).toHaveAttribute("href", "/student/core-committee/selection-1");
  });

  it("shows the brief and domains, then submits one selected domain through the dedicated endpoint", async () => {
    let submitted = false;
    state.fetch.mockImplementation((path: string, options?: { method?: string; body?: string }) => {
      if (path === "/api/student/core-committee-selections/selection-1" && options?.method === "GET")
        return response(submitted ? { ...selection, application: { status: "APPLIED", submittedAt: new Date().toISOString(), domain: { id: "domain-2", title: "Design Coordinator" }, answers: { motivation: "I can help" } } } : selection);
      if (path === "/api/student/core-committee-selections/selection-1/application" && options?.method === "POST") {
        submitted = true;
        return response({ id: "application-1" });
      }
      throw new Error(`Unexpected request: ${path}`);
    });
    const user = userEvent.setup();
    render(<StudentCoreCommitteeDetailPage />);
    expect(await screen.findByText(/A long application brief/)).toBeInTheDocument();
    expect(screen.getByText("Technical Coordinator")).toBeInTheDocument();
    expect(screen.getByText("Design Coordinator")).toBeInTheDocument();

    await user.click(screen.getByRole("radio", { name: /design coordinator/i }));
    expect(await screen.findByLabelText(/Why this domain/)).toBeInTheDocument();
    await user.type(screen.getByLabelText(/Why this domain/), "I can help");
    await user.click(screen.getByRole("button", { name: "Review application" }));
    expect(screen.getByText("Selected domain: Design Coordinator · 1 position")).toBeInTheDocument();
    await user.click(screen.getByRole("checkbox", { name: /I confirm that I want to apply/i }));
    await user.click(screen.getByRole("button", { name: "Submit application" }));

    await waitFor(() => expect(screen.getByText("Your submitted application")).toBeInTheDocument());
    const post = state.fetch.mock.calls.find(([path, options]) => path === "/api/student/core-committee-selections/selection-1/application" && options?.method === "POST");
    expect(JSON.parse(post![1].body)).toEqual({ positionId: "domain-2", answers: { motivation: "I can help" } });
    expect(screen.queryByRole("button", { name: "Submit application" })).not.toBeInTheDocument();
  });

  it("submits empty answers for a managed Core form with no questions", async () => {
    state.fetch.mockImplementation((path: string, options?: { method?: string; body?: string }) => {
      if (path === "/api/student/core-committee-selections/selection-1" && options?.method === "GET")
        return response({ ...selection, fields: [] });
      if (path === "/api/student/core-committee-selections/selection-1/application" && options?.method === "POST")
        return response({ id: "application-1" });
      throw new Error(`Unexpected request: ${path}`);
    });
    const user = userEvent.setup();
    render(<StudentCoreCommitteeDetailPage />);
    await screen.findByText("Technical Coordinator");
    await user.click(screen.getByRole("radio", { name: /technical coordinator/i }));
    await user.click(screen.getByRole("button", { name: "Review application" }));
    await user.click(screen.getByRole("checkbox", { name: /I confirm that I want to apply/i }));
    await user.click(screen.getByRole("button", { name: "Submit application" }));

    await waitFor(() => {
      const post = state.fetch.mock.calls.find(([path, options]) =>
        path === "/api/student/core-committee-selections/selection-1/application" &&
        options?.method === "POST",
      );
      expect(JSON.parse(post![1].body)).toEqual({ positionId: "domain-1", answers: {} });
    });
  });

  it("keeps submit controls unavailable after the application window closes", async () => {
    state.fetch.mockImplementation((path: string) => {
      if (path === "/api/student/core-committee-selections/selection-1")
        return response({ ...selection, applicationCloseAt: new Date(Date.now() - 1_000).toISOString() });
      throw new Error(`Unexpected request: ${path}`);
    });
    render(<StudentCoreCommitteeDetailPage />);
    expect(await screen.findByText(/Applications closed on/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Review application" })).not.toBeInTheDocument();
  });

  it("hides the shortlist outcome after final results are published", async () => {
    state.fetch.mockImplementation((path: string) => {
      if (path === "/api/student/core-committee-selections/selection-1")
        return response({
          ...selection,
          application: {
            status: "SHORTLISTED",
            submittedAt: new Date().toISOString(),
            domain: { id: "domain-1", title: "Technical Coordinator" },
            answers: {},
            interviews: [],
            shortlistOutcome: "SHORTLISTED",
            result: { outcome: "SELECTED", publishedAt: new Date().toISOString() },
          },
        });
      throw new Error(`Unexpected request: ${path}`);
    });
    render(<StudentCoreCommitteeDetailPage />);

    expect(await screen.findByText("SELECTED")).toBeInTheDocument();
    expect(screen.queryByText("You have been shortlisted for the next stage.")).not.toBeInTheDocument();
  });
});

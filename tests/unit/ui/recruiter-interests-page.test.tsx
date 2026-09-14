// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchMock = vi.fn();

vi.mock("@/modules/auth/client", () => ({
  useAuth: () => ({ accessToken: "test-access-token" }),
}));

import RecruiterInterestsPage from "../../../src/app/(recruiter)/recruiter/interests/page";

function jsonResponse(body: unknown) {
  return { ok: true, status: 200, json: async () => ({ data: body }) };
}

const SENT_INTEREST = {
  id: "int-1",
  studentId: "s1",
  studentName: "Alice Architect",
  batchName: "B.Arch 2026",
  message: "Loved your portfolio.",
  status: "SENT",
  sentAt: "2026-01-01T00:00:00.000Z",
  respondedAt: null,
};

describe("Recruiter interests page (/recruiter/interests) — V4.0 C4", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("shows an empty state when nothing has been sent", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([]));
    render(<RecruiterInterestsPage />);

    expect(await screen.findByText(/haven't expressed interest in any students yet/i)).toBeInTheDocument();
  });

  it("lists a sent interest with student name, batch, message, and status", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([SENT_INTEREST]));
    render(<RecruiterInterestsPage />);

    expect(await screen.findByText("Alice Architect")).toBeInTheDocument();
    expect(screen.getByText("B.Arch 2026")).toBeInTheDocument();
    expect(screen.getByText("Loved your portfolio.")).toBeInTheDocument();
    expect(screen.getByText("Sent")).toBeInTheDocument();
  });

  it("shows the Admin-facilitation note once an interest is accepted, never a raw contact reveal", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([{ ...SENT_INTEREST, status: "ACCEPTED", respondedAt: "2026-01-02T00:00:00.000Z" }]));
    render(<RecruiterInterestsPage />);

    expect(await screen.findByText(/admin will facilitate the connection/i)).toBeInTheDocument();
  });

  it("links each row to the student's recruiter profile page", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([SENT_INTEREST]));
    render(<RecruiterInterestsPage />);

    const name = await screen.findByText("Alice Architect");
    expect(name.closest("a")).toHaveAttribute("href", "/recruiter/students/s1");
  });
});

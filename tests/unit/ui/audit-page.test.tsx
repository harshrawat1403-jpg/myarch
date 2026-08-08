// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchMock = vi.fn();
let mockAuthState: { accessToken: string | null; role: string | null };

vi.mock("@/modules/auth/client", () => ({
  useAuth: () => mockAuthState,
}));

import AuditPage from "../../../src/app/(admin)/dashboard/audit/page";

function jsonResponse(body: unknown) {
  return { ok: true, status: 200, json: async () => ({ data: body }) };
}

const ENTRIES = [
  {
    id: "a1",
    actorUserId: "u1",
    action: "PROFILE_APPROVED",
    targetEntityType: "StudentPublicProfileDraft",
    targetEntityId: "draft-12345678",
    metadata: { studentProfileId: "sp1" },
    occurredAt: "2026-08-06T10:00:00.000Z",
  },
  {
    id: "a2",
    actorUserId: "u1",
    action: "PROFILE_CHANGES_REQUESTED",
    targetEntityType: "StudentPublicProfileDraft",
    targetEntityId: "draft-87654321",
    metadata: {},
    occurredAt: "2026-08-05T09:00:00.000Z",
  },
];

function timeline() {
  return screen.getByRole("region", { name: "Activity timeline" });
}

describe("Audit History page — activity timeline", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    mockAuthState = { accessToken: "test-access-token", role: "SECRETARY" };
  });

  it("shows a loading state before data resolves", () => {
    fetchMock.mockImplementation(() => new Promise(() => {}));
    render(<AuditPage />);
    expect(screen.getByText(/loading audit history/i)).toBeInTheDocument();
  });

  it("groups entries under a date heading and shows a humanized action label", async () => {
    fetchMock.mockResolvedValue(jsonResponse(ENTRIES));
    render(<AuditPage />);

    await screen.findByRole("region", { name: "Activity timeline" });
    expect(within(timeline()).getByText("Profile approved")).toBeInTheDocument();
    expect(within(timeline()).getByText("Changes requested")).toBeInTheDocument();
    expect(within(timeline()).getByText(/Thursday, August 6, 2026/i)).toBeInTheDocument();
    expect(within(timeline()).getByText(/Wednesday, August 5, 2026/i)).toBeInTheDocument();
  });

  it("shows an empty state when there is no activity", async () => {
    fetchMock.mockResolvedValue(jsonResponse([]));
    render(<AuditPage />);
    expect(await screen.findByText("No recent activity.")).toBeInTheDocument();
  });

  it("filters entries by search text", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(jsonResponse(ENTRIES));
    render(<AuditPage />);
    await screen.findByRole("region", { name: "Activity timeline" });

    await user.type(screen.getByLabelText("Search"), "approved");

    expect(within(timeline()).getByText("Profile approved")).toBeInTheDocument();
    expect(within(timeline()).queryByText("Changes requested")).not.toBeInTheDocument();
  });

  it("filters entries by action type", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(jsonResponse(ENTRIES));
    render(<AuditPage />);
    await screen.findByRole("region", { name: "Activity timeline" });

    await user.selectOptions(screen.getByLabelText("Action"), "PROFILE_CHANGES_REQUESTED");

    expect(within(timeline()).queryByText("Profile approved")).not.toBeInTheDocument();
    expect(within(timeline()).getByText("Changes requested")).toBeInTheDocument();
  });

  it("shows a filtered-empty state distinct from a genuinely empty log", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(jsonResponse(ENTRIES));
    render(<AuditPage />);
    await screen.findByRole("region", { name: "Activity timeline" });

    await user.type(screen.getByLabelText("Search"), "nothing matches this");

    expect(await screen.findByText("No activity matches the current filters.")).toBeInTheDocument();
  });

  it("clears filters when Clear filters is clicked", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(jsonResponse(ENTRIES));
    render(<AuditPage />);
    await screen.findByRole("region", { name: "Activity timeline" });

    await user.type(screen.getByLabelText("Search"), "approved");
    await user.click(await screen.findByRole("button", { name: "Clear filters" }));

    expect(screen.getByLabelText("Search")).toHaveValue("");
    expect(within(timeline()).getByText("Changes requested")).toBeInTheDocument();
  });

  it("exposes entry metadata behind a collapsed details disclosure", async () => {
    fetchMock.mockResolvedValue(jsonResponse(ENTRIES));
    render(<AuditPage />);
    await screen.findByRole("region", { name: "Activity timeline" });

    expect(within(timeline()).getByText("Details")).toBeInTheDocument();
    expect(within(timeline()).getByText(/"studentProfileId": "sp1"/)).toBeInTheDocument();
  });

  it("shows the role-appropriate scope description", async () => {
    mockAuthState = { accessToken: "test-access-token", role: "COORDINATOR" };
    fetchMock.mockResolvedValue(jsonResponse(ENTRIES));
    render(<AuditPage />);

    expect(await screen.findByText(/showing your own recent actions/i)).toBeInTheDocument();
  });

  it("shows an error message when loading fails", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: { code: "INTERNAL", message: "Unable to load audit history." } }),
    });
    render(<AuditPage />);
    expect(await screen.findByText("Unable to load audit history.")).toBeInTheDocument();
  });
});

// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "../../../src/components/ui/toast";
import { EditModeProvider } from "../../../src/components/edit-mode/edit-mode-context";
import { EditModeToolbar } from "../../../src/components/edit-mode/edit-mode-toolbar";

let mockAuthState: { role: string | null; accessToken: string | null } = { role: null, accessToken: null };
const getMock = vi.fn();
const postMock = vi.fn();

vi.mock("@/modules/auth/client", () => ({ useAuth: () => mockAuthState }));
vi.mock("@/lib/api-client", () => ({
  apiClient: {
    get: (...args: unknown[]) => getMock(...args),
    post: (...args: unknown[]) => postMock(...args),
  },
  ApiError: class ApiError extends Error {},
}));

function renderToolbar() {
  return render(
    <ToastProvider>
      <EditModeProvider>
        <EditModeToolbar />
      </EditModeProvider>
    </ToastProvider>,
  );
}

describe("EditModeToolbar", () => {
  beforeEach(() => {
    getMock.mockReset().mockResolvedValue({ total: 0, byPage: {} });
    postMock.mockReset();
  });

  it("renders nothing for a non-Secretary", () => {
    mockAuthState = { role: "STUDENT", accessToken: "token" };
    renderToolbar();
    expect(screen.queryByText(/edit mode/i)).not.toBeInTheDocument();
  });

  it("shows the inactive [Edit Mode] button for a Secretary", () => {
    mockAuthState = { role: "SECRETARY", accessToken: "token" };
    renderToolbar();
    expect(screen.getByRole("button", { name: /edit mode/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /preview/i })).not.toBeInTheDocument();
  });

  it("activating shows the toolbar with the pending count and Preview/Save Changes/Discard Changes", async () => {
    mockAuthState = { role: "SECRETARY", accessToken: "token" };
    getMock.mockResolvedValue({ total: 3, byPage: { about: 2, placements: 1 } });
    const user = userEvent.setup();
    renderToolbar();

    await user.click(screen.getByRole("button", { name: /edit mode/i }));

    await waitFor(() => expect(screen.getByText(/3 changes/i)).toBeInTheDocument());
    expect(screen.getByRole("button", { name: /^preview$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /save changes/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /discard changes/i })).toBeInTheDocument();
  });

  it("Save Changes and Discard Changes are disabled when there are no pending drafts", async () => {
    mockAuthState = { role: "SECRETARY", accessToken: "token" };
    getMock.mockResolvedValue({ total: 0, byPage: {} });
    const user = userEvent.setup();
    renderToolbar();

    await user.click(screen.getByRole("button", { name: /edit mode/i }));

    await waitFor(() => expect(screen.getByRole("button", { name: /save changes/i })).toBeDisabled());
    expect(screen.getByRole("button", { name: /discard changes/i })).toBeDisabled();
  });

  it("Save Changes calls the publish endpoint", async () => {
    mockAuthState = { role: "SECRETARY", accessToken: "token" };
    getMock.mockResolvedValue({ total: 2, byPage: { about: 2 } });
    postMock.mockResolvedValue({ published: 2 });
    const user = userEvent.setup();
    renderToolbar();

    await user.click(screen.getByRole("button", { name: /edit mode/i }));
    await waitFor(() => expect(screen.getByRole("button", { name: /save changes/i })).not.toBeDisabled());
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => expect(postMock).toHaveBeenCalledWith("/api/content-overrides/publish", undefined, "token"));
  });

  it("Discard Changes requires confirmation, then calls the discard endpoint", async () => {
    mockAuthState = { role: "SECRETARY", accessToken: "token" };
    getMock.mockResolvedValue({ total: 2, byPage: { about: 2 } });
    postMock.mockResolvedValue({ discarded: 2 });
    const user = userEvent.setup();
    renderToolbar();

    await user.click(screen.getByRole("button", { name: /edit mode/i }));
    await waitFor(() => expect(screen.getByRole("button", { name: /discard changes/i })).not.toBeDisabled());
    await user.click(screen.getByRole("button", { name: /discard changes/i }));

    expect(postMock).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Discard" }));

    await waitFor(() => expect(postMock).toHaveBeenCalledWith("/api/content-overrides/discard", undefined, "token"));
  });

  it("Save Changes exits Preview if it was active — avoids showing a stale pre-publish snapshot", async () => {
    mockAuthState = { role: "SECRETARY", accessToken: "token" };
    getMock.mockResolvedValue({ total: 2, byPage: { about: 2 } });
    postMock.mockResolvedValue({ published: 2 });
    const user = userEvent.setup();
    renderToolbar();

    await user.click(screen.getByRole("button", { name: /edit mode/i }));
    await waitFor(() => expect(screen.getByRole("button", { name: /^preview$/i })).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: /^preview$/i }));
    expect(screen.getByRole("button", { name: /exit preview/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => expect(postMock).toHaveBeenCalledWith("/api/content-overrides/publish", undefined, "token"));
    expect(screen.getByRole("button", { name: /^preview$/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /exit preview/i })).not.toBeInTheDocument();
  });

  it("Discard Changes exits Preview if it was active", async () => {
    mockAuthState = { role: "SECRETARY", accessToken: "token" };
    getMock.mockResolvedValue({ total: 2, byPage: { about: 2 } });
    postMock.mockResolvedValue({ discarded: 2 });
    const user = userEvent.setup();
    renderToolbar();

    await user.click(screen.getByRole("button", { name: /edit mode/i }));
    await waitFor(() => expect(screen.getByRole("button", { name: /^preview$/i })).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: /^preview$/i }));
    expect(screen.getByRole("button", { name: /exit preview/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /discard changes/i }));
    await user.click(screen.getByRole("button", { name: "Discard" }));

    await waitFor(() => expect(postMock).toHaveBeenCalledWith("/api/content-overrides/discard", undefined, "token"));
    expect(screen.getByRole("button", { name: /^preview$/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /exit preview/i })).not.toBeInTheDocument();
  });
});
